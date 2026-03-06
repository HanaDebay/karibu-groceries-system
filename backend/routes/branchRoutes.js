const express = require('express');
const router = express.Router();
const checkRole = require('../middlewares/roleCheck');
const verifyToken = require('../middlewares/authMiddleware');
const branchController = require('../controllers/branchController');

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Branch management
 */

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
router.get('/', verifyToken, branchController.getAllBranches);

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
// PUT update a branch - Director only
router.put('/:id', verifyToken, checkRole(['Director']), branchController.updateBranch);

// DELETE a branch - Director only
router.delete('/:id', verifyToken, checkRole(['Director']), branchController.deleteBranch);

module.exports = router;
