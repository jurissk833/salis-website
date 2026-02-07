const { v4: uuidv4 } = require('uuid');
const Product = require('./productSchema');

module.exports = {
    // Adapter methods to keep server.js compatible (but now Async!)

    getAll: async () => {
        const products = await Product.find({}).lean();
        return products.map(p => ({ ...p, id: p._id }));
    },

    getById: async (id) => {
        const product = await Product.findById(id).lean();
        if (product) product.id = product._id;
        return product;
    },

    add: async (productData) => {
        const product = new Product({
            _id: uuidv4(),
            ...productData
        });
        return await product.save();
    },

    update: async (id, updatedFields) => {
        return await Product.findByIdAndUpdate(id, updatedFields, { new: true });
    },

    remove: async (id) => {
        return await Product.findByIdAndDelete(id);
    }
};
