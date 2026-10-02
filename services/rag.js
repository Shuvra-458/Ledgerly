const llm = require('./llm');
const TIPS = require('../data/financeTips');

// Cache of { tipID -> embedding vector }
let tipEmbeddings = null;

function cosineSimilarity(a, b) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Pre compute embeddings for all tips (once per process)
 */
async function ensureTipEmbeddings() {
    if (tipEmbeddings) return tipEmbeddings;
    if (!llm.supportsEmbeddings()) return null;

    const entries = await Promise.all(
        TIPS.map(async (tip) => {
            const vec = await llm.embed(tip.next);
            return [tip.id, vec];
        })
    );
    tipEmbeddings = Object.fromEntries(entries);
    return tipEmbeddings;
}

/**
 * Build a natural language description of the user's financial state.
 */
function buildNarrative(snapshot) {
    const cats = snapshot.topCategories
    .slice(0, 5)
    .map((c) => `${c.name} ($${c.amount.toFixed(0)})`)
    .join(', ');

    const incomeChange = snapshot.prevMonth.income
    ? ((snapshot.income - snapshot.prevMonth.income) / snapshot.prevMonth.income) * 100 : 0;

    const expenseChange = snapshot.prevMonth.expenses
    ? ((snapshot.expenses - snapshot.prevMonth.expenses) / snapshot.prevMonth.expenses) * 100 : 0;

    return ( 
        `User finances for this month: ` +
        `income $${snapshot.income.toFixed(0)}, ` +
        `expenses $${snapshot.expenses.toFixed(0)}, ` +
        `net $${snapshot.net.toFixed(0)}, ` +
        `savings rate ${snapshot.savingsRate.toFixed(0)}, ` +
        `Top spending categories: ${cats || 'none'}. ` +
        `Income changed ${incomeChange.toFixed(1)}% vs last month, ` +
        `expenses changed ${expenseChange.toFixed(1)}% vs last month.`
    );
}

/**
 * Derive "hot topics" from the snapshot for the keyword fallback.
 */
function deriveTopics(snapshot) {
    const topics = new Set(['overview', 'budgeting']);

    if (snapshot.savingsRate < 20) topics.add('savings');
    if (snapshot.savingsRate < 5) topics.add('emergency');
    if (snapshot.net < 0) topics.add('debt');

    for (const c of snapshot.topCategories) {
        const key = c.name.toLowerCase();

        // Map category names -> tip topics
        if (key === 'food') topics.add('food');
        if (key === 'rent') { topics.add('rent'); topics.add('housing'); }
        if (key === 'transport') topics.add('transport');
        if (key === 'utilities') topics.add('utilities');
        if (key === 'entertainment') topics.add('entertainment');
        if (key === 'shopping') topics.add('shopping');
        if (key === 'health') topics.add('health');
    }

    return topics;
}

/**
 * Retrieve top-K tips relevant to the user's financial snapshot.
 */
async function retrieveRelevantTips(snapshot, topK = 3) {
    // --Semantic Path--
    if (llm.supportsEmbeddings()) {
        try {
            const embeddings = await ensureTipEmbeddings();
            const narrative = buildNarrative(snapshot);
            const queryVec = await llm.embed(narrative);

            const scored = TIPS.map((tip) => ({
                id: tip.id,
                text: tip.text,
                score: cosineSimilarity(queryVec, embeddings[tip.id]),
            }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);
            
            return { mode: 'semantic', tips: scored };
        } catch (err) {
            console.error('RAG semantic retrieval failed, falling back to keywords:', err.message);
        }
    }

    // --Keyword Fallback--
    const hot = deriveTopics(snapshot);
    const scored = TIPS.map((tip) => {
        const hits = tip.topics.filter((t) => hot.has(t)).length;
        return { id: tip.id, text: tip.text, score: hits / Math.max(tip.topics.length, 1) }; 
    })
        .filter((t) => t.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    
    return { mode: 'keyword', tips: scored };
}

module.exports = { retrieveRelevantTips, buildNarrative };