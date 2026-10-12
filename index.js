import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Nadoda Rajput Connect API is running',
        version: '1.0.0'
    });
});

// API Routes
app.use('/api', routes);

// Error Handling Middleware
app.use(errorHandler);

// Start Server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`[Server] Nadoda Rajput Connect server listening on port ${PORT}`);
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error.message);
    }
};

startServer();
