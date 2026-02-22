const Procurement = require('../models/Procurement');
const { success, error } = require('../utils/responseHandler');

// Get all procurements
exports.getAllProcurements = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'Director') {
            query.branch = req.user.branch;
        }
        const procurements = await Procurement.find(query).sort({ date: -1 });
        success(res, procurements, "Procurements fetched successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// NEW LOGIC: Get Low Stock Items (Threshold < 500kg)
exports.getLowStock = async (req, res) => {
    try {
        let query = { stock: { $lt: 500 } }; // Threshold for "Low Stock"
        if (req.user.role !== 'Director') {
            query.branch = req.user.branch;
        }
        const lowStockItems = await Procurement.find(query);
        success(res, lowStockItems, "Low stock items fetched successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Add Procurement
exports.addProcurement = async (req, res) => {
    try {
        const managerBranch = req.user.branch;
        const { produceName, produceType, tonnage, cost } = req.body;

        const existingProcurement = await Procurement.findOne({ produceName, produceType, branch: managerBranch });

        if (existingProcurement) {
            existingProcurement.tonnage += tonnage;
            existingProcurement.stock += tonnage;
            existingProcurement.cost += cost;
            existingProcurement.date = req.body.date;
            existingProcurement.sellingPrice = req.body.sellingPrice;
            
            await existingProcurement.save();
            success(res, existingProcurement, "Procurement stock updated successfully");
        } else {
            const newProcurement = new Procurement({ ...req.body, branch: managerBranch });
            await newProcurement.save();
            success(res, newProcurement, "New procurement recorded successfully");
        }
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Update Procurement
exports.updateProcurement = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const procurement = await Procurement.findById(id);
        if (!procurement) return error(res, "Procurement record not found", 404);

        if (req.user.role === 'Manager' && procurement.branch !== req.user.branch) {
            return error(res, "Access denied. You can only edit procurements for your branch.", 403);
        }

        if (updates.tonnage && updates.tonnage !== procurement.tonnage) {
            const difference = updates.tonnage - procurement.tonnage;
            if (procurement.stock + difference < 0) {
                 return error(res, "Cannot reduce tonnage: Resulting stock would be negative.", 400);
            }
            procurement.stock += difference;
            procurement.tonnage = updates.tonnage;
        }

        Object.assign(procurement, updates);
        await procurement.save();
        success(res, procurement, "Procurement updated successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Delete Procurement
exports.deleteProcurement = async (req, res) => {
    try {
        const procurement = await Procurement.findById(req.params.id);
        if (!procurement) return error(res, "Procurement record not found", 404);
        if (req.user.role === 'Manager' && procurement.branch !== req.user.branch) return error(res, "Access denied.", 403);
        await procurement.deleteOne();
        success(res, null, "Procurement record deleted successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

