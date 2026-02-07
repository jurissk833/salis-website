const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Auth & Config
require('dotenv').config();
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
const Product = require('./models/productModel');
const translations = require('./data/translations');

const connectDB = require('./config/db');
// Connect to Database
connectDB();

const { storage } = require('./config/cloudinary');
// Multer Setup for Image Uploads (Cloudinary)
const multer = require('multer');
const upload = multer({ storage: storage });

// Localization Middleware (Cookie > Session > Default)
const localeMiddleware = (req, res, next) => {
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
        const { title, description, price, features, warranty } = req.body;
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
            warranty
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
        res.render('edit', { title: res.locals.t.admin.form.editTitle, product });
    } catch (err) {
        res.redirect('/admin');
    }
});

app.post('/admin/edit/:id', requireAuth, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery', maxCount: 10 }]), async (req, res) => {
    try {
        const { title, description, price, features, warranty } = req.body;
        const updateData = {
            title,
            description,
            price,
            features: features ? features.split('\n').map(f => f.trim()).filter(f => f) : [],
            warranty
        };

        if (req.files && req.files['image']) {
            updateData.image = req.files['image'][0].path;
        }

        // Handle gallery images - append to existing
        if (req.files && req.files['gallery']) {
            const newGalleryImages = req.files['gallery'].map(file => file.path);
            // We need to fetch existing product to append, or use $push if we were using raw mongoose.
            // Since our adapter is simple, let's just fetch, append in memory, and update.
            // OR simpler: just push independently? 
            // The Product.update method uses findByIdAndUpdate with {new: true}.
            // Standard Mongoose way to push: { $push: { gallery: { $each: newGalleryImages } } }
            // But our update adapter takes an object and replaces fields. 
            // Let's modify the update adapter to optionally handle $push or just do logic here.
            // To keep it simple and consistent with "replace fields" logic of adapter, we might need to fetch first.
            const currentProduct = await Product.getById(req.params.id);
            const currentGallery = currentProduct.gallery || [];
            updateData.gallery = [...currentGallery, ...newGalleryImages];
        }

        await Product.update(req.params.id, updateData);
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
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


// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
