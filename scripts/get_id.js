const mongoose = require('mongoose');
const Product = require('../models/productModel');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const products = await Product.getAll();
        if (products.length > 0) {
            console.log('PRODUCT_ID:', products[0].id);
        } else {
            console.log('NO_PRODUCTS');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
