import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nadoda_connect';
        const conn = await mongoose.connect(mongoUri);
        console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
    } catch (error) {
        console.error(`[MongoDB] Connection error: ${error.message}`);
        process.exit(1);
    }
};
