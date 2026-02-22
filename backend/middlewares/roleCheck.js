const { error } = require('../utils/responseHandler');

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // Ensure user is logged in (req.user should be set by your auth middleware)
        if (!req.user) {
            return error(res, "Unauthorized. Please login.", 401);
        }

        if (!allowedRoles.includes(req.user.role)) {
            return error(res, "Access denied. Insufficient permissions.", 403);
        }

        next();
    };
};

module.exports = checkRole;