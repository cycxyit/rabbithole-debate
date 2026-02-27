import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../db/database';

export function setupAuthRoutes() {
    const router = express.Router();

    // Use a provided secret or a strong default for development. 
    // In production, ALWAYS specify JWT_SECRET in .env
    const JWT_SECRET = process.env.JWT_SECRET || 'rabbithole_super_secret_dev_key';

    // ─── REGISTER ─────────────────────────────────────────────────────────────
    router.post('/register', async (req: express.Request, res: express.Response) => {
        try {
            const { username, email, password } = req.body;

            if (!username || !email || !password || username.trim() === '' || email.trim() === '' || password.trim() === '') {
                return res.status(400).json({ error: 'Username, email and password are required' });
            }

            const db = await getDB();

            // Check if user already exists
            const existingUser = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
            if (existingUser) {
                return res.status(400).json({ error: 'User with that email or username already exists' });
            }

            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Insert into SQLite
            const result = await db.run(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, hashedPassword]
            );

            // Generate Token
            const token = jwt.sign({ id: result.lastID, username, email }, JWT_SECRET, {
                expiresIn: '7d', // Token validity
            });

            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: { id: result.lastID, username, email }
            });
        } catch (error) {
            console.error('[AUTH] Registration error:', error);
            res.status(500).json({ error: 'Internal server error during registration' });
        }
    });

    // ─── LOGIN ────────────────────────────────────────────────────────────────
    router.post('/login', async (req: express.Request, res: express.Response) => {
        try {
            const { identifier, password } = req.body;

            if (!identifier || !password) {
                return res.status(400).json({ error: 'Username/Email and password are required' });
            }

            const db = await getDB();

            // Find user by either email or username
            const isEmail = identifier.includes('@');
            const query = isEmail ? 'SELECT * FROM users WHERE email = ?' : 'SELECT * FROM users WHERE username = ?';
            const user = await db.get(query, [identifier]);
            if (!user) {
                return res.status(401).json({ error: 'Invalid identifier or password' });
            }

            // Verify password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Generate Token
            const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, {
                expiresIn: '7d',
            });

            res.json({
                message: 'Login successful',
                token,
                user: { id: user.id, username: user.username, email: user.email }
            });
        } catch (error) {
            console.error('[AUTH] Login error:', error);
            res.status(500).json({ error: 'Internal server error during login' });
        }
    });

    return router;
}
