const Transaction = require('../models/Transaction');
const Review = require('../models/Review');

/**
 * Compute start-of-month and start-of-next-month for the current date.
 */
const getMonthRange = (date = new Date()) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return { start, end };
};

/**
 * Return an array of the last N months as { label, year, month, start, end }
 */
const getLastNMonths = (n = 6) => {
    const months = [];
    const now = new Date();

    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        months.push({
            label: start.toLocaleString('en-US', { month: 'short' }),
            year: start.getFullYear(),
            month: start.getMonth() + 1,
            start,
            end,
        });
    }
    return months;
};

// GET /dashboard
exports.showDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { start: monthStart, end: monthEnd } = getMonthRange();

        // Lifetime Totals
        const [lifetime] = await Transaction.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: null,
                    income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
                    expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, { $abs: '$amount' }, 0] } },
                },
            },
        ]);

        // This month totals
        const [thisMonth] = await Transaction.aggregate([
            { $match: { user: userId, date: { $gte: monthStart, $lt: monthEnd } } },
            {
                $group: {
                    _id: null,
                    income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
                    expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, { $abs: '$amount' }, 0] } },
                },
            },
        ]);

        // Last 6 months income/expense
        const months = getLastNMonths(6);
        const sixMonthsAgo = months[0].start;

        const monthlyRaw = await Transaction.aggregate([
            { $match: { user: userId, date: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                        type: '$type',
                    },
                    total: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, { $abs: '$amount' }, '$amount'] } },
                },
            },
        ]);

        // Reshape into arrays aligned to month labels
        const monthlyData = months.map((m) => {
            const income = monthlyRaw.find(
                (r) => r._id.year === m.year && r._id.month  === m.month && r._id.type === 'income'
            );

            const expense = monthlyRaw.find(
                (r) => r._id.year === m.year && r._id.month === m.month && r._id.type === 'expense'
            );
            return {
                label: m.label,
                income: income ? income.total : 0,
                expense: expense ? expense.total : 0,
            };
        });

        // This month's expenses by category
        const categoryRaw = await Transaction.aggregate([
            {
                $match: {
                    user: userId,
                    type: 'expense',
                    date: { $gte: monthStart, $lt: monthEnd },
                },
            },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: { $abs: '$amount' } },
                },
            },
            { $sort: { total: -1 } },
        ]);

        const categoryData = {
            labels: categoryRaw.map((c) => c._id),
            values: categoryRaw.map((c) => c.total),
        };

        // Recent transactions
        const recent = await Transaction.find({ user: userId })
        .sort({ date: -1 })
        .limit(5)
        .lean();

        // Assemble view model
        const lifetimeIncome = lifetime?.income || 0;
        const lifetimeExpense = lifetime?.expense || 0;
        const lifetimeBalance = lifetimeIncome - lifetimeExpense;

        const monthIncome = thisMonth?.income || 0;
        const monthExpense = thisMonth?.expense || 0;

        const now = new Date();
        const currentReview = await Review.findOne({
            user: userId,
            'period.year': now.getFullYear(),
            'period.month': now.getMonth() + 1, 
        }).lean();

        res.render('dashboard', {
            title: 'Dashboard',
            summary: {
                balance: lifetimeBalance,
                lifetimeIncome,
                lifetimeExpense,
                monthIncome,
                monthExpense,
            },
            monthlyData,
            categoryData,
            recent,
            currentReview,
            llmEnabled: require('../services/llm').isEnabled(),
        });
    } catch (err) {
        next(err);
    }
};
