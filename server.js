const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

// Auth & Config
require('dotenv').config();
console.log(`[Startup] Server starting at ${new Date().toISOString()}`);

const app = express();
const PORT = process.env.PORT || 3000;

// Request Logger
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Middleware
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'salis-secret-key-123',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Passport Setup
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: (process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000") + "/auth/google/callback"
},
    function (accessToken, refreshToken, profile, cb) {
        // Check if email is allowed
        const allowedEmails = process.env.ALLOWED_EMAILS ? process.env.ALLOWED_EMAILS.split(',') : [];
        const userEmail = profile.emails[0].value;

        if (allowedEmails.includes(userEmail)) {
            return cb(null, profile);
        } else {
            // We can't access session/locale here easily in standard passport callback without extra work, 
            // so we'll pass a generic code or english message that can be mapped if needed, 
            // but for now let's use a simple English fallback that the UI can choose to ignore or display.
            // Or we can assume 'ar' default for backend errors if we really want.
            return cb(null, false, { message: translations['ar'].login.accessDenied });
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Models
// Models
// Models
const Product = require('./models/productModel');
const Setting = require('./models/settingModel');
const translations = require('./data/translations');

const connectDB = require('./config/db');
// Connect to Database
connectDB();

const { storage } = require('./config/cloudinary');
// Multer Setup for Image Uploads (Cloudinary)
const multer = require('multer');
const upload = multer({ storage: storage });

// Localization Middleware (Cookie > Session > Default)
const localeMiddleware = async (req, res, next) => {
    let lang = req.cookies.lang || req.session.lang || 'ar';

    // Ensure valid lang
    if (!['ar', 'en'].includes(lang)) {
        lang = 'ar';
    }

    // Sync session/cookie just in case
    if (req.session.lang !== lang) req.session.lang = lang;

    res.locals.lang = lang;
    res.locals.t = translations[lang];
    res.locals.dir = translations[lang].dir;

    // Debug translations
    // console.log(`[Debug] Lang: ${lang}, Footer Keys:`, Object.keys(res.locals.t.footer));

    // Load Site Settings
    try {
        res.locals.siteSettings = await Setting.getAll();
    } catch (err) {
        console.error('Failed to load settings:', err);
        res.locals.siteSettings = {};
    }

    next();
};

app.use(localeMiddleware);

// Admin Auth Middleware
const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    } else {
        const t = res.locals.t; // Use current lang for redirect message if needed
        res.redirect('/admin/login');
    }
};

// --- PUBLIC ROUTES ---

app.post('/product/:id/review', async (req, res) => {
    try {
        const { name, rating, comment } = req.body;
        await Product.addReview(req.params.id, {
            name: name || 'Customer',
            rating: Number(rating),
            comment,
            date: new Date()
        });
        res.redirect(`/product/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.redirect(`/product/${req.params.id}`);
    }
});

app.get('/change-lang/:lang', (req, res) => {
    const newLang = req.params.lang;
    if (['ar', 'en'].includes(newLang)) {
        // Set Cookie (Max Age: 30 Days)
        res.cookie('lang', newLang, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        req.session.lang = newLang; // Keep session synced
    }

    // Safe Back Redirect
    let backURL = req.get('Referer') || '/';
    if (backURL.includes('/change-lang')) {
        backURL = '/';
    }
    res.redirect(backURL);
});

app.get('/', async (req, res) => {
    try {
        const products = await Product.getAll();
        res.render('index', { title: res.locals.t.nav.home, products });
    } catch (err) {
        console.error(err);
        res.render('index', { title: res.locals.t.nav.home, products: [] });
    }
});

console.log('Registering /product/:id/review route');

app.get('/product/:id', async (req, res) => {
    try {
        const product = await Product.getById(req.params.id);
        if (!product) return res.status(404).send('Product not found');
        res.render('product', { title: product.title, product });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- AUTH ROUTES ---

app.get('/admin/login', (req, res) => {
    res.render('login', { title: res.locals.t.nav.login, error: req.query.error });
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    (req, res, next) => {
        passport.authenticate('google', {
            failureRedirect: `/admin/login?error=${encodeURIComponent(translations[req.session.lang || 'ar'].login.accessDenied)}`
        })(req, res, next);
    },
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/admin');
    });

app.get('/admin/logout', (req, res) => {
    req.logout((err) => {
        res.redirect('/admin/login');
    });
});

// --- ADMIN ROUTES ---

app.get('/admin', requireAuth, async (req, res) => {
    try {
        const products = await Product.getAll();
        res.render('admin', { title: res.locals.t.nav.dashboard, products });
    } catch (err) {
        res.redirect('/');
    }
});

app.post('/admin/add', requireAuth, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery', maxCount: 10 }]), async (req, res) => {
    try {
        const { title, description, price, features, warranty, video } = req.body;
        // With Cloudinary storage, req.file.path is the full URL
        const image = (req.files && req.files['image']) ? req.files['image'][0].path : null;

        // Handle gallery images
        let gallery = [];
        if (req.files && req.files['gallery']) {
            gallery = req.files['gallery'].map(file => file.path);
        }

        // Process features text into array (split by new lines)
        const featuresArray = features ? features.split('\n').map(f => f.trim()).filter(f => f) : [];

        await Product.add({
            title,
            description,
            price,
            image,
            gallery,
            features: featuresArray,
            warranty,
            video
        });
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

app.get('/admin/edit/:id', requireAuth, async (req, res) => {
    try {
        const product = await Product.getById(req.params.id);
        if (!product) return res.redirect('/admin');

        res.render('edit', {
            title: res.locals.t.admin.form.editTitle,
            product: product.toObject({ virtuals: true })
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

app.post('/admin/edit/:id', requireAuth, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery', maxCount: 10 }]), async (req, res) => {
    try {
        const { title, description, price, features, warranty, video, deleteMainImage, deletedGalleryImages } = req.body;
        const updateData = {
            title,
            description,
            price,
            features: features ? features.split('\n').map(f => f.trim()).filter(f => f) : [],
            warranty,
            video
        };

        // Handle Main Image
        if (req.files && req.files['image']) {
            // New image uploaded, replaces old one
            updateData.image = req.files['image'][0].path;
        } else if (deleteMainImage === 'true') {
            // No new image, but marked for deletion
            updateData.image = null;
        }

        // Handle Gallery Images
        const currentProduct = await Product.getById(req.params.id);
        const currentGallery = currentProduct.gallery || [];
        let updatedGallery = [...currentGallery];

        // Process deferred gallery deletions
        if (deletedGalleryImages) {
            const imagesToDelete = Array.isArray(deletedGalleryImages) ? deletedGalleryImages : [deletedGalleryImages];
            updatedGallery = updatedGallery.filter(img => !imagesToDelete.includes(img));
        }

        // Add new gallery images
        if (req.files && req.files['gallery']) {
            const newGalleryImages = req.files['gallery'].map(file => file.path);
            updatedGallery = [...updatedGallery, ...newGalleryImages];
        }

        updateData.gallery = updatedGallery;

        await Product.update(req.params.id, updateData);
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

app.post('/admin/product/:id/delete-gallery-image', requireAuth, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        const product = await Product.getById(req.params.id);

        if (product && product.gallery) {
            const updatedGallery = product.gallery.filter(img => img !== imageUrl);
            await Product.update(req.params.id, { gallery: updatedGallery });
        }
        res.redirect('/admin/edit/' + req.params.id);
    } catch (err) {
        console.error(err);
        res.redirect('/admin/edit/' + req.params.id);
    }
});

app.post('/admin/product/:id/delete-main-image', requireAuth, async (req, res) => {
    try {
        await Product.update(req.params.id, { image: null });
        res.redirect('/admin/edit/' + req.params.id);
    } catch (err) {
        console.error(err);
        res.redirect('/admin/edit/' + req.params.id);
    }
});

// Review Management Routes
app.post('/admin/product/:id/review/:reviewId/toggle', requireAuth, async (req, res) => {
    console.log(`[Toggle] Request for Product: ${req.params.id}, Review: ${req.params.reviewId}`);
    try {
        const result = await Product.toggleReviewVisibility(req.params.id, req.params.reviewId);
        console.log('[Toggle] Result:', result ? 'Success' : 'Failed (Product/Review not found)');
        if (result) {
            res.sendStatus(200);
        } else {
            res.status(404).send('Review not found');
        }
    } catch (err) {
        console.error('[Toggle] Error:', err);
        res.sendStatus(500);
    }
});

app.post('/admin/product/:id/review/:reviewId/delete', requireAuth, async (req, res) => {
    console.log(`[Delete Review] Request for Product: ${req.params.id}, Review: ${req.params.reviewId}`);
    try {
        await Product.deleteReview(req.params.id, req.params.reviewId);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.post('/admin/delete/:id', requireAuth, async (req, res) => {
    try {
        await Product.remove(req.params.id);
        res.redirect('/admin');
    } catch (err) {
        res.redirect('/admin');
    }
});

app.post('/admin/settings/hero', requireAuth, upload.single('heroImage'), async (req, res) => {
    try {
        if (req.file) {
            await Setting.set('heroImage', req.file.path);
        }
        res.redirect('/admin');
    } catch (err) {
        console.error('Error uploading hero image:', err);
        res.redirect('/admin');
    }
});

app.post('/admin/settings/toggle-reviews', requireAuth, async (req, res) => {
    try {
        const showReviews = req.body.showReviews === 'on';
        console.log(`[Settings] Toggle Reviews: ${showReviews}`);
        await Setting.set('showReviews', showReviews);
        res.redirect('/admin');
    } catch (err) {
        console.error('Error toggling reviews setting:', err);
        res.redirect('/admin');
    }
});


// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
