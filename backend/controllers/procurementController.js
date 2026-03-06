const Procurement = require('../models/Procurement');
const { success, error } = require('../utils/responseHandler');

// Get all procurements
exports.getAllProcurements = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'Director') {
            query.branch = req.user.branch;
        }

        // Add search functionality
        if (req.query.search) {
            const search = req.query.search;
            query.$or = [
                { produceName: { $regex: search, $options: 'i' } },
                { produceType: { $regex: search, $options: 'i' } },
                { dealerName: { $regex: search, $options: 'i' } },
            ];
        }

        if (req.query.startDate || req.query.endDate) {
            query.date = {};
            if (req.query.startDate) {
                const start = new Date(req.query.startDate);
                start.setHours(0, 0, 0, 0);
                query.date.$gte = start;
            }
            if (req.query.endDate) {
                const end = new Date(req.query.endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        let apiQuery = Procurement.find(query).sort({ date: -1 });

        if (req.query.limit && !req.query.search && !req.query.startDate && !req.query.endDate) {
            apiQuery = apiQuery.limit(parseInt(req.query.limit, 10));
        }

        const procurements = await apiQuery;
        success(res, procurements, "Procurements fetched successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// NEW LOGIC: Get Low Stock Items (Threshold < 1000kg)
exports.getLowStock = async (req, res) => {
    try {
        let query = { stock: { $lt: 1000 } }; // Threshold for "Low Stock"
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
        const payload = { ...req.body };
        const tonnage = Number(payload.tonnage || 0);
        const cost = Number(payload.cost || 0);
        const sellingPricePerKg = Number((payload.sellingPricePerKg ?? payload.sellingPrice) || 0);

        payload.sellingPricePerKg = sellingPricePerKg;
        payload.sellingPrice = sellingPricePerKg;
        payload.costPerKg = tonnage > 0 ? Math.round(cost / tonnage) : 0;

        // This logic creates a new procurement record for every transaction,
        // preserving historical data for reporting, such as dealer information.
        const managerBranch = req.user.branch;
        const newProcurement = new Procurement({
            ...payload,
            branch: managerBranch,
            // Initialize the current stock of this batch to its procured tonnage.
            stock: tonnage
        });
        await newProcurement.save();
        success(res, newProcurement, "New procurement recorded successfully");
    } catch (err) {
        if (err.name === 'ValidationError') {
            return error(res, Object.values(err.errors).map(e => e.message).join(', '), 400);
        }
        error(res, err.message, 500);
    }
};

// Update Procurement
exports.updateProcurement = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };
        
        const procurement = await Procurement.findById(id);
        if (!procurement) return error(res, "Procurement record not found", 404);

        if (req.user.role === 'Manager' && procurement.branch !== req.user.branch) {
            return error(res, "Access denied. You can only edit procurements for your branch.", 403);
        }

        if (updates.tonnage && Number(updates.tonnage) !== procurement.tonnage) {
            const difference = Number(updates.tonnage) - procurement.tonnage;
            if (procurement.stock + difference < 0) {
                 return error(res, "Cannot reduce tonnage: Resulting stock would be negative.", 400);
            }
            procurement.stock += difference;
            procurement.tonnage = Number(updates.tonnage);
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'sellingPricePerKg') || Object.prototype.hasOwnProperty.call(updates, 'sellingPrice')) {
            const price = Number((updates.sellingPricePerKg ?? updates.sellingPrice) || 0);
            updates.sellingPricePerKg = price;
            updates.sellingPrice = price;
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'cost') || Object.prototype.hasOwnProperty.call(updates, 'tonnage')) {
            const effectiveCost = Number((updates.cost ?? procurement.cost) || 0);
            const effectiveTonnage = Number((updates.tonnage ?? procurement.tonnage) || 0);
            updates.costPerKg = effectiveTonnage > 0 ? Math.round(effectiveCost / effectiveTonnage) : 0;
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
