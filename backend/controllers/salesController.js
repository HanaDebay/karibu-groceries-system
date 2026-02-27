const Sale = require('../models/Sale');
const CreditSale = require('../models/CreditSale');
const Procurement = require('../models/Procurement');
const { success, error } = require('../utils/responseHandler');

// Helper function to update stock
async function updateStock(produceName, tonnageSold, branch) {
    // Find all batches with stock > 0, sorted by date (FIFO)
    const batches = await Procurement.find({
        produceName: produceName,
        branch: branch,
        stock: { $gt: 0 }
    }).sort({ date: 1 });

    const totalStock = batches.reduce((sum, batch) => sum + batch.stock, 0);

    if (totalStock < tonnageSold) {
        throw new Error(`Insufficient Stock: Only ${totalStock}kg of ${produceName} available at ${branch}`);
    }

    let remainingTonnageToDeduct = tonnageSold;
    let lastBatchUsed = null;

    for (const batch of batches) {
        if (remainingTonnageToDeduct <= 0) break;
        lastBatchUsed = batch;

        const stockToTake = Math.min(batch.stock, remainingTonnageToDeduct);
        batch.stock -= stockToTake;
        remainingTonnageToDeduct -= stockToTake;
        await batch.save();
    }

    // Return the last batch used for linking the sale record, which contains the produceId
    return lastBatchUsed;
}

// NEW LOGIC: Get Aggregated Sales Stats (Director Only)
exports.getSalesStats = async (req, res) => {
    try {
        const stats = await Sale.aggregate([
            {
                $group: {
                    _id: "$branch",
                    totalRevenue: { $sum: "$amountPaid" },
                    totalTonnage: { $sum: "$tonnage" },
                    count: { $sum: 1 }
                }
            }
        ]);
        success(res, stats, "Sales statistics fetched successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Get All Sales (Cash & Credit) for Manager/Agent
exports.getSales = async (req, res) => {
    try {
        const { branch } = req.user;
        if (!branch) return error(res, "Branch not found in user token", 400);
        
        // Fetch both collections
        const cashSales = await Sale.find({ branch }).lean();
        const creditSales = await CreditSale.find({ branch }).lean();

        // Normalize data structure
        const formattedCash = cashSales.map(s => ({
            ...s,
            type: 'cash',
            amount: s.amountPaid
        }));

        const formattedCredit = creditSales.map(s => ({
            ...s,
            type: 'credit',
            amount: s.amountDue // Tracking value of credit sale
        }));

        const allSales = [...formattedCash, ...formattedCredit].sort((a, b) => new Date(b.date) - new Date(a.date));

        success(res, allSales, "Sales records fetched successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Create Cash Sale
exports.createCashSale = async (req, res) => {
    try {
        const { produceName, tonnage } = req.body;
        const { branch, fullName, role } = req.user;

        if (!branch || !fullName) return error(res, "Incomplete user data in token. Please login again.", 401);

        const product = await updateStock(produceName, tonnage, branch);

        const newSale = new Sale({
            ...req.body,
            produceId: product._id,
            recordedBy: fullName,
            branch: branch
        });
        await newSale.save();

        success(res, newSale, `Cash sale recorded by ${fullName} (${role}) successfully`);
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Create Credit Sale
exports.createCreditSale = async (req, res) => {
    try {
        const { produceName, tonnage } = req.body;
        const { branch, fullName, role } = req.user;

        if (!branch || !fullName) return error(res, "Incomplete user data in token. Please login again.", 401);

        await updateStock(produceName, tonnage, branch);

        const newCreditSale = new CreditSale({
            ...req.body,
            recordedBy: fullName,
            branch: branch
        });
        await newCreditSale.save();

        success(res, newCreditSale, `Credit sale recorded by ${fullName} (${role}) successfully`);
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Delete Cash Sale
exports.deleteCashSale = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        if (!sale) return error(res, "Sale not found", 404);

        const product = await Procurement.findById(sale.produceId);
        if (product) {
            product.stock += sale.tonnage;
            await product.save();
        }

        await sale.deleteOne();
        success(res, null, "Sale deleted and stock restored");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Update Cash Sale
exports.updateCashSale = async (req, res) => {
    try {
        const { tonnage } = req.body;
        const sale = await Sale.findById(req.params.id);
        if (!sale) return error(res, "Sale not found", 404);

        if (tonnage && tonnage !== sale.tonnage) {
            const product = await Procurement.findById(sale.produceId);
            if (!product) return error(res, "Associated product not found in stock", 404);

            product.stock += sale.tonnage; // Revert old
            if (product.stock < tonnage) return error(res, `Insufficient stock. Available: ${product.stock}`, 400);
            product.stock -= tonnage; // Deduct new
            await product.save();
            
            sale.tonnage = tonnage;
        }

        if (req.body.amountPaid) sale.amountPaid = req.body.amountPaid;
        if (req.body.buyerName) sale.buyerName = req.body.buyerName;

        await sale.save();
        success(res, sale, "Sale updated and stock adjusted");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// Delete Credit Sale
exports.deleteCreditSale = async (req, res) => {
    try {
        const sale = await CreditSale.findById(req.params.id);
        if (!sale) return error(res, "Credit Sale not found", 404);

        const product = await Procurement.findOne({ produceName: sale.produceName, branch: sale.branch });
        if (product) {
            product.stock += sale.tonnage;
            await product.save();
        }
        await sale.deleteOne();
        success(res, null, "Credit sale deleted and stock restored");
    } catch (err) {
        error(res, err.message, 500);
    }
};