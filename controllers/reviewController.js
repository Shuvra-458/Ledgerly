const Review = require('../models/Review');
const { generateReview } = require('../services/financeReview');

/**
 * POST /reviews/generate?year=YYYY&month=M
 * Generates a review for a given period, then redirects to dashboard
 */

exports.generate = async (req, res, next) => {
    try {
        const now = new Date();
        const year = parseInt(req.query.year, 10) || now.getFullYear();
        const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
        
        await generateReview(req.user._id, year, month);
        res.redirect('/dashboard');
    } catch (err) {
        next(err);
    }
};

/**
 *  GET /reviews
 *  List all reviews for the current user
 */

exports.list = async (req, res, next) => {
    try {
        const reviews = await Review.find({ user: req.user._id })
        .sort({ 'period.year': -1, 'period.month': -1 })
        .lean();

        res.render('reviews/index', {
            title: 'Reviews',
            reviews,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /reviews/:id
 * Show a single review
 */
exports.show = async (req, res, next) => {
    try {
        const review = await Review.findOne({ _id: req.params.id, user: req.user._id }).lean();

        if (!review) {
            return res.status(404).render('error', {
                title: 'Not Found',
                statusCode: 404,
                message: 'Review not found',
            });
        }
        res.render('reviews/show', { title: 'Review', review });
    } catch (err) {
        next(err);
    }
};
