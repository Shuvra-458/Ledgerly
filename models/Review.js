const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        period: {
            month: { type: Number, required: true },
            year: { type: Number, required: true },
        },
        snapshot: {
            income: Number,
            expenses: Number,
            net: Number,
            savingsRate: Number,
            transactionCount: Number,
            topCategories: [{ name: String, amount: Number }],
            prevMonth: {
                income: Number,
                expenses: Number,
            },
        },
        content: {
            headline: String,
            summary: String,
            expenseReview: String,
            incomeReview: String,
            advice: [String],
            sentiment: { type: String, enum: ['positive', 'neutral', 'concerning' ] },
        },
        // Audit trail
        retrievedTips: [
            {
                id: String,
                text: String,
                score: Number,
            },
        ],
        source: { type: String, enum: ['llm', 'fallback'], required: true },
        model: String,
        tokensUsed: {
            prompt: Number,
            completion: Number,
        },
    },
    { timestamps: true }
);

// One review per user per (month, year)
reviewSchema.index({ user: 1, 'period.year': 1, 'period.month': 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
