const Transaction = require('../models/Transaction');
const { CATEGORIES } = require('../models/Transaction');

// ---- Helper Functions ---
/**
 * Parse and validate transaction input from req.body
 * Returns { data, errors } - data is safe to pass to Mongoose.
 */

const parseTransactionInput = (body) => {
    const errors = [];
    const data = {};

    // Title
    data.title = (body.title || '').trim();
    if (!data.title) errors.push('Title is required');
    else if (data.title.length > 100) errors.push('Title cannot exceed 100 characters');

    // Amount
    const rawAmount = parseFloat(body.amount);
    if (isNaN(rawAmount) || rawAmount <= 0) {
        errors.push('Amount must be a positive number');
    } else {
        const type = body.type === 'income' ? 'income' : 'expense';
        data.type = type;
        data.amount = type === 'income' ? Math.abs(rawAmount) : -Math.abs(rawAmount);
    }

    // Category
    data.category = CATEGORIES.includes(body.category) ? body.category : 'Other';

    // Date
    if (body.date) {
        const d = new Date(body.date);
        if (isNaN(d.getTime())) errors.push('Invalid date');
        else data.date = d;
    } else {
        data.date = new Date();
    }

    // Notes (optional)
    data.notes = (body.notes || '').trim().slice(0, 500);

    return { data, errors }; 
};

/**
 * Fetch a transaction by ID and verify it belongs to the current user.
 * Sends 404 and returns null if not found/not owned.
 */

const findOwnedTransaction = async (id, userId) => {
    return Transaction.findOne({ _id: id, user: userId });
};

// --- Controllers

// GET /transactions
exports.listTransactions = async (req, res, next) => {
    try {
        const { category, type, from, to } = req.query;

        // Build filter
        const filter = { user: req.user._id };
        if (category && CATEGORIES.includes(category)) filter.category = category;
        if (type === 'income' || type === 'expense') filter.type = type;

        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = new Date(from);
            if (to) {
                // Include the entire 'to' day
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                filter.date.$lte = toDate;
            }
        }

        const transactions = await Transaction.find(filter).sort({ date: -1 }).lean();

        // Compute summary for header
        const totals = transactions.reduce(
            (acc, t) => {
                if (t.type === 'income') acc.income += t.amount;
                else acc.expense += Math.abs(t.amount);
                return acc;
            },
            { income: 0, expense: 0 }
        );
        totals.balance = totals.income - totals.expense;

        res.render('transactions/index', {
            title: 'Transactions',
            transactions,
            totals,
            categories: CATEGORIES,
            filters: { category, type, from, to },
        });
    } catch (err) {
        next (err);
    }
};

// GET /transactions/new
exports.showNewForm = (req, res) => {
    res.render('transactions/form', {
        title: 'New Transaction',
        transaction: {
            title: '',
            amount: '',
            type: 'expense',
            category: 'Other',
            date: new Date().toISOString().slice(0, 10),
            notes: '',
        },
        categories: CATEGORIES,
        errors: [],
        mode: 'create',
    });
};

// POST /transactions
exports.createTransaction = async (req, res, next) => {
    const { data, errors } = parseTransactionInput(req.body);

    if (errors.length) {
        return res.status(400).render('transactions/form', {
            title: 'New Transaction',
            transaction: { ...req.body, date: req.body.date || new Date().toISOString().slice(0, 10) },
            categories: CATEGORIES, 
            errors,
            mode: 'create',
        });
    }

    try {
        await Transaction.create({ ...data, user: req.user._id });
        res.redirect('/transactions');
    } catch (err) {
        next(err);
    }
};

// GET /transactions/:id/edit
exports.showEditForm = async (req, res, next) => {
    try {
        const transaction = await findOwnedTransaction(req.params.id, req.user._id);
        if (!transaction) {
            return res.status(404).render('error', {
                title: 'Not Found',
                statusCode: 404,
                message: 'Transaction not found',
            });
        }

        res.render('transactions/form', {
            title: 'Edit Transaction',
            transaction: {
                ...transaction.toObject(),
                amount: Math.abs(transaction.amount),
                date: transaction.date.toISOString().slice(0, 10),
            },
            categories: CATEGORIES,
            errors: [],
            mode: 'edit',
        });
    } catch (err) {
        next(err);
    }
};

// POST /transactions/:id (update)
exports.updateTransaction = async (req, res, next) => {
    const { data, errors } = parseTransactionInput(req.body);

    try {
        const transaction = await findOwnedTransaction(req.params.id, req.user._id);
        if (!transaction) {
            return res.status(404).render('error', {
                title: 'Not Found',
                statusCode: 404,
                message: 'Transaction not found',
            });
        }

        if (errors.length) {
            return res.status(400).render('transactions/form', {
                title: 'Edit Transaction',
                transaction: { ...req.body, _id: req.params.id, date: req.body.date || new Date().toISOString().slice(0, 10) },
                categories: CATEGORIES,
                errors,
                mode: 'edit',
            });
        }

        Object.assign(transaction, data);
        await transaction.save();
        res.redirect('/transactions');
    } catch (err) {
        next(err);
    }
};

// POST /transactions/:id/delete
exports.deleteTransaction = async (req, res, next) => {
    try {
        const result = await Transaction.deleteOne({ _id: req.params.id, user: req.user._id });
        if (result.deletedCount == 0) {
            return res.status(404).render('error', {
                title: 'Not Found',
                statusCode: 404,
                message: 'Transaction not found',
            });
        }
        res.redirect('/transactions');
    } catch (err) {
        next(err);
    }
};


