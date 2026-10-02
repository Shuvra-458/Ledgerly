const mongoose = require('mongoose');

const CATEGORIES = [
    'Food',
    'Rent',
    'Salary',
    'Transport',
    'Utilities',
    'Entertainment',
    'Health',
    'Shopping',
    'Other',
];

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
        },
        category: {
            type: String,
            enum: CATEGORIES,
            default: 'Other',
        },
        type: {
            type: String,
            enum: ['income', 'expense'],
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
            index: true,
        },
        notes: {
            type: String,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
        },
    },
    { timestamps: true }
);

// --- Compound index for dashboard queries ---
transactionSchema.index({ user: 1, date: -1 });

// --- Virtual: formatted amount with sign
transactionSchema.virtual('displayAmount').get(function () {
    const sign = this.type === 'income' ? '+' : '-';
    const emoji = this.type === 'income' ? '💰' : '💸';
    return `${emoji} ${sign}$${Math.abs(this.amount).toFixed(2)}`;
});

// Ensure virtuals appear in JSON output
transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Transaction', transactionSchema);
module.exports.CATEGORIES = CATEGORIES;

