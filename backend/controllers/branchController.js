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

// Update a branch
exports.updateBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location } = req.body;

        const branch = await Branch.findById(id);
        if (!branch) {
            return error(res, "Branch not found", 404);
        }

        if (name) branch.name = name;
        if (location) branch.location = location;

        await branch.save();
        success(res, branch, "Branch updated successfully");
    } catch (err) {
        if (err.code === 11000) {
            return error(res, "A branch with this name already exists.", 409);
        }
        error(res, err.message, 500);
    }
};

// Delete a branch
exports.deleteBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const branch = await Branch.findById(id);
        if (!branch) {
            return error(res, "Branch not found", 404);
        }
        await branch.deleteOne();
        success(res, null, "Branch deleted successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};
