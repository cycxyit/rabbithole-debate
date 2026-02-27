import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { setupRabbitHoleRoutes } from './routes/rabbithole';
import { setupAuthRoutes } from './routes/auth';
import setupHistoryRoutes from './routes/history';
import { getDB } from './db/database';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.use('/api', setupRabbitHoleRoutes(null));
app.use('/api/auth', setupAuthRoutes());
app.use('/api/history', setupHistoryRoutes()); // Mounted history routes

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../../frontend/build')));

// Handle any remaining requests by serving the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

getDB().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch(err => {
  console.error("Failed to initialize database", err);
  process.exit(1);
}); 