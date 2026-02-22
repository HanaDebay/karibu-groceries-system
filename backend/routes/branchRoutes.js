const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const verifyToken = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleCheck');

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Branch management
 */

/**
 * @swagger
 * /api/branches:
 *   post:
 *     summary: Create a new branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Branch created successfully
 *       403:
 *         description: Access denied
 */
router.post('/', verifyToken, checkRole(['Director']), branchController.createBranch);

/**
 * @swagger
 * /api/branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all branches
 */
router.get('/', verifyToken, checkRole(['Director', 'Manager']), branchController.getAllBranches);

module.exports = router;
