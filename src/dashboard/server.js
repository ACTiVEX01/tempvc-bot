const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const cors = require('cors');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();

// ─── Passport Configuration ─────────────────────────────────
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: `${process.env.DASHBOARD_URL}/auth/callback`,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 } // 1 day
}));
app.use(passport.initialize());
app.use(passport.session());

// ─── View Engine ────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// ─── Routes ─────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.render('index', { user: req.user });
});

app.get('/dashboard', checkAuth, async (req, res) => {
    res.render('dashboard', { user: req.user });
});

app.get('/logs', checkAuth, async (req, res) => {
    res.render('logs', { user: req.user });
});

// ─── Auth Middleware ─────────────────────────────────────────
function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/login');
}

// ─── Export Starter ─────────────────────────────────────────
function createDashboard(client) {
    app.set('discordClient', client);
    
    const PORT = process.env.DASHBOARD_PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🌐 Dashboard running on port ${PORT}`);
    });
}

module.exports = { createDashboard };