const jwt = require('jsonwebtoken');
const { error } = require('../utils/responseHandler');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return error(res, "Access Denied. No token provided.", 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // This sets req.user, which roleCheck needs
        next();
    } catch (err) {
        return error(res, "Invalid Token", 400);
    }
};

module.exports = verifyToken;