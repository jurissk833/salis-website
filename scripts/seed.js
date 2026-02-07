require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../models/productSchema');
const connectDB = require('../config/db');

const seedData = async () => {
    try {
        await connectDB();

        const dataPath = path.join(__dirname, '../data/products.json');
        const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        // Map data to match schema (specifically _id)
        const products = jsonData.map(p => ({
            _id: p.id,
            ...p
        }));

        // Clear existing data
        await Product.deleteMany({});

        // Insert new data
        await Product.insertMany(products);

        console.log('✅ Data Seeded Successfully');
        process.exit();
    } catch (error) {
        console.error('❌ Error Seeding Data:', error);
        process.exit(1);
    }
};

seedData();
