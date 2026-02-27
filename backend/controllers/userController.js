const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { success, error } = require('../utils/responseHandler');

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        const formattedUsers = users.map(user => ({
            _id: user._id,
            fullName: user.fullName, 
            email: user.email,
            role: user.role,
            branch: user.branch,
            status: user.status || "Active"
        }));
        res.status(200).json(formattedUsers);
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Register User
exports.registerUser = async (req, res) => {
    try {
        const { fullName, email, password, role, branch } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return error(res, "User already exists", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ fullName, email, password: hashedPassword, role, branch });
        await newUser.save();
        
        success(res, newUser, "User registered successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Login User
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return error(res, "Invalid email or password", 400);

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return error(res, "Invalid email or password", 400);

        const token = jwt.sign(
            { _id: user._id, fullName: user.fullName, role: user.role, branch: user.branch },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        success(res, { token, user: { name: user.fullName, role: user.role, branch: user.branch } }, "Logged in successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Update User
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, role, branch, fullName, status } = req.body;

        const user = await User.findById(id);
        if (!user) return error(res, "User not found", 404);

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) return error(res, "Email already in use", 400);
            user.email = email;
        }

        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        if (role) user.role = role;
        if (branch) user.branch = branch;
        if (fullName) user.fullName = fullName;
        if (status) user.status = status;

        await user.save();
        success(res, user, "User updated successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Delete User
exports.deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return error(res, "User not found", 404);
        success(res, null, "User deleted successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};
