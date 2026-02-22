const express = require('express');
const router = express.Router();
const checkRole = require('../middlewares/roleCheck');
const verifyToken = require('../middlewares/authMiddleware');
const procurementController = require('../controllers/procurementController');

/**
 * @swagger
 * tags:
 *   name: Procurement
 *   description: Stock and produce management
 */

// GET: Get all procurements - Director sees all, Manager/Agent sees branch specific
/**
 * @swagger
 * /api/procurement:
 *   get:
 *     summary: Get all procurement records
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of procurements
 */
router.get('/', verifyToken, checkRole(['Director', 'Manager', 'Sales Agent']), procurementController.getAllProcurements);

// GET: Low Stock Items - For Manager Notifications
/**
 * @swagger
 * /api/procurement/low-stock:
 *   get:
 *     summary: Get items with low stock (< 500kg)
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of low stock items
 */
router.get('/low-stock', verifyToken, checkRole(['Director', 'Manager']), procurementController.getLowStock);

// POST: Record Procurement - Protected: Manager Only
/**
 * @swagger
 * /api/procurement/add:
 *   post:
 *     summary: Add new procurement or update existing stock
 *     tags: [Procurement]
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
 *               - produceType
 *               - tonnage
 *               - cost
 *             properties:
 *               produceName:
 *                 type: string
 *               produceType:
 *                 type: string
 *               tonnage:
 *                 type: number
 *               cost:
 *                 type: number
 *     responses:
 *       200:
 *         description: Procurement recorded
 */
router.post('/add', verifyToken, checkRole(['Manager']), procurementController.addProcurement);

// PUT: Update Procurement - Protected: Manager (own branch) or Director
/**
 * @swagger
 * /api/procurement/{id}:
 *   put:
 *     summary: Update procurement details
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Procurement updated
 */
router.put('/:id', verifyToken, checkRole(['Director', 'Manager']), procurementController.updateProcurement);

// DELETE: Delete Procurement - Protected: Director or Manager
/**
 * @swagger
 * /api/procurement/{id}:
 *   delete:
 *     summary: Delete procurement record
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Procurement deleted
 */
router.delete('/:id', verifyToken, checkRole(['Director', 'Manager']), procurementController.deleteProcurement);

module.exports = router;