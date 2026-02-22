const express = require('express');
const router = express.Router();
const checkRole = require('../middlewares/roleCheck.js'); 
const verifyToken = require('../middlewares/authMiddleware.js');
const userController = require('../controllers/userController.js');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

// GET: Get all users - Used for Director Dashboard
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', verifyToken, checkRole(['Director']), userController.getAllUsers);

// POST: Register User - Protected: Director Only
/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - role
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Director, Manager, Sales Agent]
 *               branch:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 */
// router.post('/register', userController.registerUser);
router.post('/register', verifyToken, checkRole(['Director']), userController.registerUser);

// POST: Login User
/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', userController.loginUser);

// PUT: Update User Details (Credentials, Role, Branch) - Protected: Director Only
/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user details
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/:id', verifyToken, checkRole(['Director']), userController.updateUser);

// DELETE: Delete User - Protected: Director Only
/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
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
 *         description: User deleted
 */
router.delete('/:id', verifyToken, checkRole(['Director']), userController.deleteUser);

module.exports = router;