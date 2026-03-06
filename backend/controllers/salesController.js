const Sale = require('../models/Sale');
const CreditSale = require('../models/CreditSale');
const Procurement = require('../models/Procurement');
const { success, error } = require('../utils/responseHandler');

function deriveCreditTotals(sale) {
    // Normalize legacy + new credit fields so all callers use one consistent shape.
    const amountDue = Number(sale.amountDue || 0);
    const amountPaid = Number(sale.amountPaid || 0);
    const totalAmount = Number(sale.totalAmount || (amountDue + amountPaid));
    const remaining = Math.max(0, totalAmount - amountPaid);
    const status = remaining <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';
    return { amountDue: remaining, amountPaid, totalAmount, status };
}

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

// NEW LOGIC: Director Summary (Cash + Credit)
exports.getDirectorSummary = async (req, res) => {
    try {
        const cashStats = await Sale.aggregate([
            {
                $group: {
                    _id: "$branch",
                    cashRevenue: { $sum: "$amountPaid" }
                }
            }
        ]);

        const creditStats = await CreditSale.aggregate([
            {
                $group: {
                    _id: "$branch",
                    creditOutstanding: { $sum: "$amountDue" },
                    creditTotal: { $sum: { $ifNull: ["$totalAmount", { $add: ["$amountDue", "$amountPaid"] }] } }
                }
            }
        ]);

        const branchMap = new Map();

        cashStats.forEach(item => {
            branchMap.set(item._id, {
                branch: item._id,
                cashRevenue: Number(item.cashRevenue || 0),
                creditOutstanding: 0,
                creditTotal: 0
            });
        });

        creditStats.forEach(item => {
            const existing = branchMap.get(item._id) || {
                branch: item._id,
                cashRevenue: 0,
                creditOutstanding: 0,
                creditTotal: 0
            };
            existing.creditOutstanding = Number(item.creditOutstanding || 0);
            existing.creditTotal = Number(item.creditTotal || 0);
            branchMap.set(item._id, existing);
        });

        const salesByBranch = Array.from(branchMap.values())
            .map(item => ({
                branch: item.branch,
                totalRevenue: Number(item.cashRevenue || 0) + Number(item.creditTotal || 0),
                creditOutstanding: item.creditOutstanding
            }))
            .sort((a, b) => a.branch.localeCompare(b.branch));

        const totalSales = salesByBranch.reduce((sum, item) => sum + Number(item.totalRevenue || 0), 0);
        const creditOutstanding = salesByBranch.reduce((sum, item) => sum + Number(item.creditOutstanding || 0), 0);

        success(res, { salesByBranch, totalSales, creditOutstanding }, "Director summary fetched successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// NEW LOGIC: Director Sales Overview (All branches, cash + credit)
exports.getDirectorSalesOverview = async (req, res) => {
    try {
        const cashSales = await Sale.find({}).lean();
        const creditSales = await CreditSale.find({}).lean();

        const formattedCash = cashSales.map(s => ({
            id: s._id,
            produce: s.produceName,
            type: s.produceType || "N/A",
            branch: s.branch,
            agent: s.recordedBy,
            saleType: "Cash",
            quantity: s.tonnage,
            amount: s.amountPaid,
            date: s.date,
            status: "Paid",
            dueDate: null
        }));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const formattedCredit = creditSales.map(s => {
            let status = Number(s.amountDue) > 0 ? "Pending" : "Paid";
            if (status === "Pending" && s.dueDate) {
                const due = new Date(s.dueDate);
                due.setHours(0, 0, 0, 0);
                if (due < today) status = "Overdue";
            }
            return {
                id: s._id,
                produce: s.produceName,
                type: s.produceType || "N/A",
                branch: s.branch,
                agent: s.recordedBy,
                saleType: "Credit",
                quantity: s.tonnage,
                amount: s.totalAmount || (Number(s.amountDue || 0) + Number(s.amountPaid || 0)),
                date: s.dispatchDate,
                status: status,
                dueDate: s.dueDate
            };
        });

        const allSales = [...formattedCash, ...formattedCredit]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        success(res, allSales, "Director sales overview fetched successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};

// NEW LOGIC: Director Credit Overview (All branches)
exports.getDirectorCreditOverview = async (req, res) => {
    try {
        const creditSales = await CreditSale.find({}).lean();

        const formatted = creditSales.map(s => {
            const totals = deriveCreditTotals(s);
            return ({
            id: s._id,
            buyer: s.buyerName,
            branch: s.branch,
            agent: s.recordedBy,
            produce: s.produceName,
            amountDue: totals.amountDue,
            amountPaid: totals.amountPaid,
            totalAmount: totals.totalAmount,
            paymentStatus: s.paymentStatus || totals.status,
            dueDate: s.dueDate
        });
        });

        const sorted = formatted.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        success(res, sorted, "Director credit overview fetched successfully");
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

        const formattedCredit = creditSales.map(s => {
            // Credit rows are returned with computed outstanding totals for UI consistency.
            const totals = deriveCreditTotals(s);
            return ({
                ...s,
                type: 'credit',
                amountDue: totals.amountDue,
                amountPaid: totals.amountPaid,
                totalAmount: totals.totalAmount,
                paymentStatus: s.paymentStatus || totals.status,
                amount: totals.totalAmount
            });
        });

        const allSales = [...formattedCash, ...formattedCredit].sort((a, b) => {
            const dateA = new Date(a.date || a.dispatchDate || 0);
            const dateB = new Date(b.date || b.dispatchDate || 0);
            return dateB - dateA;
        });

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

        const initialAmountDue = Number(req.body.amountDue || 0);
        // Snapshot original credit value at creation time.
        const newCreditSale = new CreditSale({
            ...req.body,
            amountDue: initialAmountDue,
            totalAmount: initialAmountDue,
            amountPaid: 0,
            paymentStatus: 'pending',
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

// Receive Credit Payment
exports.receiveCreditPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, role, branch } = req.user;
        const amount = Number(req.body.amount || 0);
        const method = String(req.body.method || 'cash');
        const note = String(req.body.note || '');
        const paidOn = req.body.paidOn ? new Date(req.body.paidOn) : new Date();

        // Reject invalid or impossible payments before touching DB state.
        if (!Number.isFinite(amount) || amount <= 0) {
            return error(res, "Payment amount must be greater than 0", 400);
        }
        if (Number.isNaN(paidOn.getTime())) {
            return error(res, "Invalid payment date", 400);
        }

        const sale = await CreditSale.findById(id);
        if (!sale) return error(res, "Credit sale not found", 404);

        if (role !== 'Director' && sale.branch !== branch) {
            return error(res, "Access denied. You can only receive payments for your branch.", 403);
        }

        const current = deriveCreditTotals(sale);
        if (current.amountDue <= 0) {
            return error(res, "This credit sale is already fully paid", 400);
        }
        if (amount > current.amountDue) {
            return error(res, `Payment exceeds outstanding balance (UGX ${current.amountDue})`, 400);
        }

        // Persist payment trail and recompute balance atomically on this record.
        sale.totalAmount = current.totalAmount;
        sale.amountPaid = current.amountPaid + amount;
        sale.amountDue = Math.max(0, sale.totalAmount - sale.amountPaid);
        sale.paymentStatus = sale.amountDue <= 0 ? 'paid' : sale.amountPaid > 0 ? 'partial' : 'pending';
        sale.payments.push({
            amount,
            paidOn,
            method,
            note,
            receivedBy: fullName
        });

        await sale.save();
        success(res, sale, "Credit payment received successfully");
    } catch (err) {
        error(res, err.message, 500);
    }
};
