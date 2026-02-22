const Branch = require('../models/Branch');
const { success, error } = require('../utils/responseHandler');

// Create a new branch
exports.createBranch = async (req, res) => {
    try {
        const { name, location } = req.body;
        const existingBranch = await Branch.findOne({ name });
        if (existingBranch) return error(res, "Branch already exists", 400);

        const newBranch = new Branch({ name, location });
        await newBranch.save();
        success(res, newBranch, "Branch created successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Get all branches
exports.getAllBranches = async (req, res) => {
    try {
        const branches = await Branch.find();
        success(res, branches, "Branches fetched successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};
