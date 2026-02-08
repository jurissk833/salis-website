const mongoose = require('mongoose');
const Product = require('../models/productModel');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const products = await Product.getAll();
        const testProduct = products.find(p => p.title === 'Video Test Product');

        if (testProduct) {
            console.log('FOUND_PRODUCT_ID:', testProduct.id);
        } else {
            console.log('PRODUCT_NOT_FOUND');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
