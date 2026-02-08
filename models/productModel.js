const { v4: uuidv4 } = require('uuid');
const Product = require('./productSchema');

module.exports = {
    // Adapter methods to keep server.js compatible (but now Async!)

    getAll: async () => {
        const products = await Product.find({}).lean();
        return products.map(p => ({ ...p, id: p._id }));
    },

    getById: async (id) => {
        const product = await Product.findById(id);
        if (product) {
            // Ensure virtuals or manual id mapping
            // id is already a virtual getter for _id in Mongoose usually, but since we disabled _id on root...
            // meaningful toObject might needed for EJS
            return product;
        }
        return null;
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
    },

    addReview: async (id, review) => {
        const product = await Product.findById(id);
        if (product) {
            product.reviews.push(review);
            return await product.save();
        }
        return null;
    },
    deleteReview: async (productId, reviewId) => {
        const product = await Product.findById(productId);
        if (product) {
            product.reviews = product.reviews.filter(r => r._id.toString() !== reviewId);
            return await product.save();
        }
        return null;
    },
    toggleReviewVisibility: async (productId, reviewId) => {
        console.log(`[Model] Toggling review ${reviewId} for product ${productId}`);
        try {
            const product = await Product.findById(productId);
            if (product) {
                // Ensure reviews array exists and search for ID
                if (!product.reviews) {
                    console.log('[Model] Product has no reviews array');
                    return null;
                }

                // Mongoose subdocument .id() method
                const review = product.reviews.id(reviewId);

                if (review) {
                    console.log(`[Model] Found review. Current status: ${review.hidden}. Toggling...`);
                    review.hidden = !review.hidden;
                    return await product.save();
                } else {
                    console.log('[Model] Review ID not found in product.reviews');
                }
            } else {
                console.log('[Model] Product not found');
            }
        } catch (error) {
            console.error('[Model] Error in toggle:', error);
        }
        return null;
    }
};
