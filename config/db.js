const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
    if (isConnected || mongoose.connection.readyState === 1) {
        return;
    }

    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/salis';
        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 3000,
            connectTimeoutMS: 3000,
        });
        isConnected = !!conn.connections[0].readyState;
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Warning: ${error.message}`);
    }
};

module.exports = connectDB;
