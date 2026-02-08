const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    _id: {
        type: String, // We'll use the existing UUIDs
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String, // Filename or Cloudinary URL
        required: false
    },
    gallery: {
        type: [String],
        default: []
    },
    features: {
        type: [String],
        default: []
    },
    warranty: {
        type: String,
        default: ''
    },
    video: {
        type: String, // YouTube URL
        required: false
    }
}, {
    timestamps: true,
    _id: false // Disable auto-generation since we provide UUID
});

module.exports = mongoose.model('Product', productSchema);
