const express = require('express');
const router = express.Router();
const checkRole = require('../middlewares/roleCheck');
const verifyToken = require('../middlewares/authMiddleware');
const salesController = require('../controllers/salesController');

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Sales management
 */

// GET: All Sales - Protected: Manager, Sales Agent, Director
/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get all sales records for the user's branch
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sales
 */
router.get('/', verifyToken, checkRole(['Manager', 'Sales Agent', 'Director']), salesController.getSales);

// POST: Cash Sale - Protected: Manager or Sales Agent

/**
 * @swagger
 * /api/sales/cash:
 *   post:
 *     summary: Record a cash sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produceName
 *               - tonnage
 *               - amountPaid
 *             properties:
 *               produceName:
 *                 type: string
 *               tonnage:
 *                 type: number
 *               amountPaid:
 *                 type: number
 *     responses:
 *       200:
 *         description: Sale recorded
 */
router.post('/cash', verifyToken, checkRole(['Manager', 'Sales Agent']), salesController.createCashSale);

// POST: Credit Sale - Protected: Manager or Sales Agent
/**
 * @swagger
 * /api/sales/credit:
 *   post:
 *     summary: Record a credit sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produceName
 *               - tonnage
 *               - amountDue
 *               - buyerName
 *     responses:
 *       200:
 *         description: Credit sale recorded
 */
router.post('/credit', verifyToken, checkRole(['Manager', 'Sales Agent']), salesController.createCreditSale);

// --- UPDATE & DELETE ROUTES (With Stock Adjustment Logic) ---

// DELETE: Cash Sale
/**
 * @swagger
 * /api/sales/cash/{id}:
 *   delete:
 *     summary: Delete a cash sale (restores stock)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Sale deleted
 */
router.delete('/cash/:id', verifyToken, checkRole(['Manager', 'Sales Agent']), salesController.deleteCashSale);

// PUT: Update Cash Sale
/**
 * @swagger
 * /api/sales/cash/{id}:
 *   put:
 *     summary: Update a cash sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Sale updated
 */
router.put('/cash/:id', verifyToken, checkRole(['Manager', 'Sales Agent']), salesController.updateCashSale);

// DELETE: Credit Sale
router.delete('/credit/:id', verifyToken, checkRole(['Manager', 'Sales Agent']), salesController.deleteCreditSale);

// GET: Sales Stats - Protected: Director Only
/**
 * @swagger
 * /api/sales/stats:
 *   get:
 *     summary: Get aggregated sales statistics
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales statistics
 */
router.get('/stats', verifyToken, checkRole(['Director']), salesController.getSalesStats);

module.exports = router;