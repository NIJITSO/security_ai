const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: { username: user.username, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /auth/seed — create default users (run once)
router.post('/seed', async (req, res) => {
    try {
        const users = [
            { username: 'admin', password: 'admin123', role: 'admin' },
            { username: 'entreprise', password: 'entreprise123', role: 'entreprise' },
            { username: 'encadrant', password: 'encadrant123', role: 'encadrant' }
        ];

        const results = [];
        for (const u of users) {
            const exists = await User.findOne({ username: u.username });
            if (!exists) {
                await User.create(u);
                results.push(`${u.username} (${u.role}) créé`);
            } else {
                results.push(`${u.username} existe déjà`);
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
