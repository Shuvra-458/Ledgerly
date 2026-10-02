const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            // HTML request -> redirect to login; 401 JSON
            return req.accepts('html')
            ? res.redirect('/login')
            : res.status(401).json({ message: "Not authorized, no token" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            res.clearCookie('token');
            return req.accepts('html')
            ? res.redirect('/login')
            : res.status(401).json({ message: "User no longer exists" });
        }

        req.user = user;
        // Make user available to all EJS templates
        res.locals.user = user;
        res.locals.currencySymbol = require('../utils/currency').symbol(user.currency);
        next();
    } catch (err) {
        res.clearCookie('token');
        return req.accepts('html')
        ? res.redirect('/login')
        : res.status(401).json({ message: "Not authorized, token invalid" });
    }
};

// Redirects already logged in users away from /login and /register
const redirectIfAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) return next();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        return user
        ? res.redirect('/dashboard')
        : next();
    } catch {
        return next();
    }
};

module.exports = { protect, redirectIfAuth };
