const Transaction = require('../models/Transaction');
const Review = require('../models/Review');
const llm = require('./llm');
const rag = require('./rag');

// ============================================================
// Snapshot builder
// ============================================================

async function buildSnapshot(userId, year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const prevStart = new Date(year, month - 2, 1);
  const prevEnd = start;

  const [current, previous, categoryRaw, count] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: userId, date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, { $abs: '$amount' }, 0] } },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { user: userId, date: { $gte: prevStart, $lt: prevEnd } } },
      {
        $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, { $abs: '$amount' }, 0] } },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { user: userId, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', amount: { $sum: { $abs: '$amount' } } } },
      { $sort: { amount: -1 } },
      { $limit: 5 },
    ]),
    Transaction.countDocuments({ user: userId, date: { $gte: start, $lt: end } }),
  ]);

  const income = current[0]?.income || 0;
  const expenses = current[0]?.expenses || 0;
  const net = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

  return {
    income,
    expenses,
    net,
    savingsRate,
    transactionCount: count,
    topCategories: categoryRaw.map((c) => ({ name: c._id, amount: c.amount })),
    prevMonth: {
      income: previous[0]?.income || 0,
      expenses: previous[0]?.expenses || 0,
    },
  };
}

// ============================================================
// Fallback (templated) review
// ============================================================

function fallbackReview(snapshot, tips) {
  const { income, expenses, net, savingsRate, topCategories } = snapshot;

  const sentiment =
    net > 0 && savingsRate >= 20 ? 'positive' :
    net > 0 ? 'neutral' :
    'concerning';

  const topCat = topCategories[0];

  const headline =
    sentiment === 'positive' ? `Strong month — ${savingsRate.toFixed(0)}% savings rate` :
    sentiment === 'neutral'  ? `Balanced month, room to grow` :
                               `Spending exceeds income this month`;

  const summary =
    `You earned $${income.toFixed(0)} and spent $${expenses.toFixed(0)}, ` +
    `for a net of $${net.toFixed(0)} (savings rate ${savingsRate.toFixed(1)}%). ` +
    (topCat ? `Largest category was ${topCat.name} at $${topCat.amount.toFixed(0)}.` : '');

  const expenseReview = topCategories.length
    ? `Top expenses: ${topCategories.slice(0, 3).map((c) => `${c.name} $${c.amount.toFixed(0)}`).join(', ')}.`
    : 'No expenses recorded this month.';

  const incomeReview = income > 0
    ? `Income this month: $${income.toFixed(0)}.`
    : 'No income recorded this month.';

  const advice = tips.length
    ? tips.map((t) => t.text)
    : [
        'Track every purchase for the next 30 days to spot leaks.',
        'Set a target savings rate and automate the transfer on payday.',
        'Review subscriptions and recurring charges quarterly.',
      ];

  return {
    headline,
    summary,
    expenseReview,
    incomeReview,
    advice: advice.slice(0, 3),
    sentiment,
  };
}

// ============================================================
// LLM prompt
// ============================================================

const SYSTEM_PROMPT = `You are a concise financial advisor that outputs structured JSON only.

CRITICAL RULES:
1. Your ENTIRE response must be a single JSON object.
2. Do NOT include any text before the opening '{' or after the closing '}'.
3. Do NOT wrap the JSON in markdown code fences (no \`\`\`json, no \`\`\`).
4. Do NOT add commentary, explanations, or follow-up questions.
5. Use ONLY the numbers provided — never invent figures.
6. If a field is unclear, use an empty string, not null.

The JSON object must have exactly these keys:
- headline (string, max 80 chars)
- summary (string)
- expenseReview (string)
- incomeReview (string)
- advice (array of exactly 3 strings)
- sentiment (one of: "positive", "neutral", "concerning")`;

function buildUserPrompt(snapshot, retrievedTips) {
  const tipsBlock = retrievedTips.length
    ? retrievedTips.map((t, i) => `${i + 1}. ${t.text}`).join('\n')
    : '(no specific principles retrieved — use general best practices)';


  return `Analyze this financial snapshot and produce a review.

FINANCIAL SNAPSHOT (${snapshot.transactionCount} transactions this month):
- Income: $${snapshot.income.toFixed(2)}
- Expenses: $${snapshot.expenses.toFixed(2)}
- Net: $${snapshot.net.toFixed(2)}
- Savings rate: ${snapshot.savingsRate.toFixed(1)}%
- Top categories: ${snapshot.topCategories.map((c) => `${c.name} ($${c.amount.toFixed(0)})`).join(', ') || 'none'}
- Previous month income: $${snapshot.prevMonth.income.toFixed(2)}
- Previous month expenses: $${snapshot.prevMonth.expenses.toFixed(2)}

RELEVANT BUDGETING PRINCIPLES (ground your advice in these):
${tipsBlock}

Respond with ONLY the JSON object. No prose. No markdown. No extra text.

Required schema:
{
  "headline": "one-line summary, max 80 characters",
  "summary": "2-3 sentences overviewing the month's finances",
  "expenseReview": "1-2 sentences about spending patterns",
  "incomeReview": "1-2 sentences about income",
  "advice": ["specific actionable tip 1", "specific actionable tip 2", "specific actionable tip 3"],
  "sentiment": "positive" | "neutral" | "concerning"
}

Rules for sentiment:
- "positive" if savings rate >= 20%
- "neutral" if net is positive but savings rate < 20%
- "concerning" if net is negative`;
}

// ============================================================
// Robust JSON extraction
// ============================================================

/**
 * Extract the first valid JSON object from a possibly noisy LLM response.
 * Handles: leading/trailing text, markdown fences, and truncation.
 */
function extractJson(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty LLM response');
  }

  // 1. Strip markdown fences if present
  let cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // 2. Strip BOM / zero-width chars
  cleaned = cleaned.replace(/^[\uFEFF\u200B]/, '');

  // 3. Fast path — is the whole thing already valid JSON?
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // fall through to surgical extraction
  }

  // 4. Extract substring from first '{' to last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(
      `No JSON object found in LLM response. First 300 chars: ${cleaned.slice(0, 300)}`
    );
  }

  const candidate = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(candidate);
  } catch (err) {
    throw new Error(
      `Failed to parse extracted JSON: ${err.message}. ` +
      `Extracted (first 300 chars): ${candidate.slice(0, 300)}`
    );
  }
}

// ============================================================
// Main orchestrator
// ============================================================

async function generateReview(userId, year, month) {
  // 1. Snapshot
  const snapshot = await buildSnapshot(userId, year, month);

  if (snapshot.transactionCount === 0) {
    const err = new Error('No transactions found for this period.');
    err.statusCode = 400;
    throw err;
  }

  // 2. RAG retrieval
  const { mode: retrievalMode, tips } = await rag.retrieveRelevantTips(snapshot, 3);

  // 3. LLM (with fallback)
  let content;
  let source;
  let model;
  let tokensUsed = { prompt: 0, completion: 0 };

  if (llm.isEnabled()) {
    try {
      const result = await llm.complete({
        system: SYSTEM_PROMPT,
        user: buildUserPrompt(snapshot, tips),
        temperature: 0.3,           // low temp → more deterministic JSON
        jsonMode: true,
      });

      const { text, tokensUsed: tokens, model: usedModel } = result;

      // Debug: log the raw response so we can diagnose parse failures
      if (process.env.NODE_ENV !== 'production') {
        console.log('━━━━━━━━━━ RAW LLM RESPONSE ━━━━━━━━━━');
        console.log(text);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }

      // Robust extraction
      const parsed = extractJson(text);

      // Validate minimal shape
      if (!parsed.headline || !parsed.summary || !Array.isArray(parsed.advice)) {
        throw new Error(
          'LLM response missing required fields. Got keys: ' +
          JSON.stringify(Object.keys(parsed))
        );
      }

      content = {
        headline: String(parsed.headline).slice(0, 120),
        summary: String(parsed.summary),
        expenseReview: String(parsed.expenseReview || ''),
        incomeReview: String(parsed.incomeReview || ''),
        advice: parsed.advice.slice(0, 3).map(String),
        sentiment: ['positive', 'neutral', 'concerning'].includes(parsed.sentiment)
          ? parsed.sentiment
          : 'neutral',
      };
      source = 'llm';
      model = usedModel || llm.model;
      tokensUsed = tokens;
    } catch (err) {
      console.error('═══════════════════════════════════════════════════');
      console.error('❌ LLM review failed — falling back to template');
      console.error('Error:', err.message);
      console.error('Stack:', err.stack);
      console.error('═══════════════════════════════════════════════════');
      content = fallbackReview(snapshot, tips);
      source = 'fallback';
      model = 'fallback';
    }
  } else {
    content = fallbackReview(snapshot, tips);
    source = 'fallback';
    model = 'fallback';
  }

  // 4. Persist (upsert by user + period)
  const review = await Review.findOneAndUpdate(
    { user: userId, 'period.year': year, 'period.month': month },
    {
      user: userId,
      period: { year, month },
      snapshot,
      content,
      retrievedTips: tips.map((t) => ({ id: t.id, text: t.text, score: t.score })),
      source,
      model,
      tokensUsed,
    },
    {
      upsert: true,
      returnDocument: 'after',        // replaces deprecated `new: true`
      setDefaultsOnInsert: true,
    }
  );

  return { review, retrievalMode };
}

module.exports = { generateReview, buildSnapshot, extractJson };