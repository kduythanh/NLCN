// routes/api.js
const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// Route để lấy danh sách người dùng
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: "Retrieve a list of users"
 *     responses:
 *       200:
 *         description: "A list of users"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 */
router.get('/users', async (req, res) => {
    try {
        const users = await db('users').select('*');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
