const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);

    if (req.accepts('html')) {
        return res.render('error', {
            title: "Error",
            statusCode,
            message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
        });
    }
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? 'none' : err.stack,
    });
};

module.exports = { notFound, errorHandler };

