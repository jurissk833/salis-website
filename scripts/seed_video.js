const mongoose = require('mongoose');
const Product = require('../models/productModel');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        const testProduct = {
            title: 'Video Test Product',
            price: 999,
            description: 'Testing YouTube video integration.',
            video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
            image: 'https://placehold.co/600x600',
            gallery: ['https://placehold.co/600x600'],
            features: ['Video Support', 'HD Quality']
        };

        const newProduct = await Product.add(testProduct);
        console.log('Test product added with ID:', newProduct._id);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
