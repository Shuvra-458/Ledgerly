const User = require('../models/User');
const { generateToken, cookieOptions } = require('../utils/generateToken');

// GET /register
exports.showRegister = (req, res) => {
    res.render('auth/register', {
        title: 'Create Account',
        errors: [],
        values: {},
    });
};

// GET /login
exports.showLogin = (req, res) => {
    res.render('auth/login', {
        title: 'Login',
        errors: [],
        values: {},
    });
};

// POST /register
exports.registerUser = async (req, res, next) => {
    const { name, email, password, confirmPassword } = req.body;
    const errors = [];

    // --- Validation ---
    if (!name || !email || !password) errors.push('All fields are required');
    if (password && password.length < 6) errors.push('Password must be atleast 6 characters');
    if (password !== confirmPassword) errors.push('Passwords do not match');

    if (errors.length) {
        return res.status(400).render('auth/register', {
            title: 'Create Account',
            errors,
            values: { name, email },
        });
    }

    try {
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).render('auth/register', {
                title: 'Create Account',
                errors: ['An account with that email already exists'],
                values: { name, email }
            });
        }

        const user = await User.create({ name, email, password });
        const token = generateToken(user._id);

        res.cookie('token', token, cookieOptions);
        return res.redirect('/dashboard');
    } catch (err) {
        next(err);
    }
};

// POST /login
exports.loginUser = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).render('auth/login', {
            title: 'Login',
            errors: ['Email and password are required'],
            values: { email },
        });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).render('auth/login', {
                title: 'Login',
                errors: ['Invalid email or password'],
                values: { email },
            });
        }

        const token = generateToken(user._id);
        res.cookie('token', token, cookieOptions);
        return res.redirect('/dashboard');
    } catch (err) {
        next(err);
    }
};

// POST /logout
exports.logoutUser = (req, res) => {
    res.clearCookie('token', { ...cookieOptions, maxAge: 0 });
    return res.redirect('/login');
};


