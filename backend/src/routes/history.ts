import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { authenticateToken, AuthRequest } from '../middleware/auth';

export default function setupHistoryRoutes() {
    const router = express.Router();

    // [CRITICAL] Vercel's filesystem is read-only. We MUST use /tmp to avoid 500 Internal Server Error when saving history.
    const HISTORY_DIR = process.env.VERCEL ? '/tmp/historyData' : path.join(process.cwd(), 'data', 'historyData');
    fs.mkdir(HISTORY_DIR, { recursive: true }).then(async () => {
        // Migration: move existing files from userId subdirectories to the root HISTORY_DIR
        try {
            const items = await fs.readdir(HISTORY_DIR, { withFileTypes: true });
            for (const item of items) {
                if (item.isDirectory()) {
                    const subDir = path.join(HISTORY_DIR, item.name);
                    const files = await fs.readdir(subDir);
                    for (const file of files) {
                        if (file.endsWith('.json')) {
                            const oldPath = path.join(subDir, file);
                            const newPath = path.join(HISTORY_DIR, file);
                            await fs.rename(oldPath, newPath).catch(console.error);
                        }
                    }
                    // Attempt to remove the subdirectory if empty
                    await fs.rmdir(subDir).catch(() => { });
                }
            }
        } catch (e) {
            console.error('Migration error:', e);
        }
    }).catch(err => {
        console.error('Failed to create history directory:', err);
    });

    // GET /api/history - Get all history sessions for the authenticated user
    router.get('/', authenticateToken, async (req: AuthRequest, res) => {
        try {
            const username = req.user!.username;
            const files = await fs.readdir(HISTORY_DIR);
            const sessions = [];

            const suffix = `_${username}.json`;

            for (const file of files) {
                if (file.endsWith(suffix)) {
                    const filePath = path.join(HISTORY_DIR, file);
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    sessions.push(JSON.parse(fileContent));
                }
            }

            // Sort by timestamp descending
            sessions.sort((a, b) => b.timestamp - a.timestamp);
            res.json(sessions);
        } catch (error) {
            console.error('Error fetching history:', error);
            res.status(500).json({ error: 'Failed to fetch history sessions' });
        }
    });

    // POST /api/history - Define/Update a history session
    router.post('/', authenticateToken, async (req: AuthRequest, res) => {
        try {
            const userId = req.user!.id;
            const session = req.body;

            if (!session || !session.id) {
                return res.status(400).json({ error: 'Invalid session data' });
            }

            const username = req.user!.username;
            const filePath = path.join(HISTORY_DIR, `${session.id}_${username}.json`);

            await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
            res.status(200).json({ message: 'Session saved successfully' });
        } catch (error) {
            console.error('Error saving history:', error);
            res.status(500).json({ error: 'Failed to save history session' });
        }
    });

    // DELETE /api/history/:id - Delete a user's session
    router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
        try {
            const username = req.user!.username;
            const sessionId = req.params.id;

            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID required' });
            }

            const filePath = path.join(HISTORY_DIR, `${sessionId}_${username}.json`);

            try {
                await fs.unlink(filePath);
                res.status(200).json({ message: 'Session deleted successfully' });
            } catch (err: any) {
                if (err.code === 'ENOENT') {
                    // File doesn't exist, might be already deleted or wrong ID
                    return res.status(404).json({ error: 'Session not found' });
                }
                throw err;
            }
        } catch (error) {
            console.error('Error deleting history:', error);
            res.status(500).json({ error: 'Failed to delete history session' });
        }
    });

    // PUT /api/history/:id - Rename a user's session (update query field)
    router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
        try {
            const username = req.user!.username;
            const sessionId = req.params.id;
            const { newName } = req.body;

            if (!sessionId || !newName) {
                return res.status(400).json({ error: 'Session ID and newName are required' });
            }

            const filePath = path.join(HISTORY_DIR, `${sessionId}_${username}.json`);

            try {
                const fileContent = await fs.readFile(filePath, 'utf-8');
                const session = JSON.parse(fileContent);

                session.query = newName;

                await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
                res.status(200).json({ message: 'Session renamed successfully', session });
            } catch (err: any) {
                if (err.code === 'ENOENT') {
                    return res.status(404).json({ error: 'Session not found' });
                }
                throw err;
            }
        } catch (error) {
            console.error('Error renaming history:', error);
            res.status(500).json({ error: 'Failed to rename history session' });
        }
    });

    return router;
}
