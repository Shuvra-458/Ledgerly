/**
 * Small knowledge base for RAG retrieval.
 * Each tip has a `topics` array used by the keyword-fallback retriever
 * when embeddings aren't available.
 */
module.exports = [
  {
    id: 'rule-50-30-20',
    topics: ['budgeting', 'savings', 'overview'],
    text: 'The 50/30/20 rule: aim for 50% of take-home pay on needs, 30% on wants, and 20% on savings and debt repayment.',
  },
  {
    id: 'savings-automate',
    topics: ['savings', 'income'],
    text: 'Automate your savings on payday. Transferring to savings before you can spend it dramatically increases your savings rate.',
  },
  {
    id: 'rent-30',
    topics: ['rent', 'housing', 'needs'],
    text: 'Housing costs (rent or mortgage) should ideally stay under 30% of take-home pay. Above that, consider renegotiating or moving.',
  },
  {
    id: 'food-cut-restaurants',
    topics: ['food', 'wants'],
    text: 'Food is the most common category for easy cuts. Halving restaurant and delivery spending often saves hundreds per month without much pain.',
  },
  {
    id: 'emergency-fund',
    topics: ['savings', 'emergency'],
    text: 'Build an emergency fund covering 3–6 months of essential expenses before aggressively investing. Cash buffer beats optimization early on.',
  },
  {
    id: 'debt-high-interest',
    topics: ['debt', 'savings'],
    text: 'Pay down high-interest debt (>8% APR) before investing beyond any employer match. The guaranteed return beats most market averages.',
  },
  {
    id: 'subscription-audit',
    topics: ['entertainment', 'wants', 'shopping'],
    text: 'Audit subscriptions quarterly. Unused services are the fastest silent drain on a monthly budget — cancelling 3 can free up $50–100.',
  },
  {
    id: 'transport-cheaper',
    topics: ['transport'],
    text: 'Transport is often reducible. Public transit, carpooling, or biking even 2 days a week can cut fuel and parking costs significantly.',
  },
  {
    id: 'income-side',
    topics: ['income', 'savings'],
    text: 'Savings rate improves faster from income growth than expense cuts. Negotiating a raise or adding a side stream compounds more than trimming latte money.',
  },
  {
    id: 'utilities-shop',
    topics: ['utilities', 'needs'],
    text: 'Utilities can often be renegotiated or switched. Compare providers annually — loyalty rarely pays in deregulated markets.',
  },
  {
    id: 'track-every-purchase',
    topics: ['overview', 'budgeting'],
    text: 'Track every purchase for 30 days. Visibility alone changes behavior — most people find 10–15% of spending is forgotten or unplanned.',
  },
  {
    id: 'sinking-funds',
    topics: ['savings', 'budgeting'],
    text: 'Use sinking funds for irregular expenses (car repairs, holidays, insurance). Monthly set-asides prevent these from wrecking one month.',
  },
  {
    id: 'goal-based-saving',
    topics: ['savings', 'budgeting'],
    text: 'Name every savings account (Emergency, Travel, House). Labeled goals are measurably more likely to be funded on schedule.',
  },
  {
    id: 'recurring-review',
    topics: ['budgeting', 'overview'],
    text: 'Review your budget monthly, not yearly. Habits drift; a 15-minute monthly check keeps spending aligned with intent.',
  },
  {
    id: 'wants-vs-needs',
    topics: ['budgeting', 'wants'],
    text: 'Before any non-essential purchase over $100, wait 48 hours. Most impulse buys fail this test and the savings compound.',
  },
];