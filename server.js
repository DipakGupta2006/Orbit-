require("dotenv").config();
const express = require("express");
const session = require("express-session");
const pool = require("./db");
const { createClient } = require('@sanity/client');
const app = express();
const path = require('path');
const crypto = require('crypto');
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use('/css', express.static(path.join(__dirname, 'styles')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");

// Sanity (GROQ) client setup — set SANITY_PROJECT_ID, SANITY_DATASET, SANITY_TOKEN in env
let sanity = null;
if (process.env.SANITY_PROJECT_ID) {
    sanity = createClient({
        projectId: process.env.SANITY_PROJECT_ID,
        dataset: process.env.SANITY_DATASET || 'production',
        apiVersion: process.env.SANITY_API_VERSION || '2024-06-01',
        useCdn: false,
        token: process.env.SANITY_TOKEN || undefined
    });
} else {
    console.warn('Sanity not configured: set SANITY_PROJECT_ID to enable GROQ API.');
}

// Simple GROQ passthrough endpoint: GET /api/groq?query=<encoded_groq>&params=<json-encoded-params>
app.get('/api/groq', async (req, res) => {
    if (!sanity) return res.status(500).json({ error: 'Sanity not configured on server' });
    const query = req.query.query;
    const params = req.query.params ? JSON.parse(req.query.params) : {};
    if (!query) return res.status(400).json({ error: 'query parameter is required' });
    try {
        const data = await sanity.fetch(query, params);
        return res.json(data);
    } catch (err) {
        console.error('GROQ fetch error:', err);
        return res.status(500).json({ error: 'GROQ fetch failed', details: err.message });
    }
});

app.use(session({
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



function hashPassword(password) {
    return crypto.createHash("sha256").update(password).digest("hex");
}

app.post("/register", async (req, res) => {
    const { username, email, password, confirm_password } = req.body;

    if (!username || !email || !password || !confirm_password) {
        return res.status(400).send("Please fill all fields.");
    }
    if (password !== confirm_password) {
        return res.status(400).send("Passwords do not match.");
    }

    try {
        const hashedPassword = hashPassword(password);
        await pool.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword]);
        return res.redirect("/");
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).send("Email already registered.");
        }
        console.error(error);
        return res.status(500).send("Server error while registering.");
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send("Please enter username and password.");
    }

    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE username = ? LIMIT 1", [username]);
        if (rows.length === 0) {
            return res.status(401).send("Invalid username or password.");
        }

        const user = rows[0];
        const hashedPassword = hashPassword(password);
        if (user.password !== hashedPassword) {
            return res.status(401).send("Invalid username or password.");
        }

        req.session.username = user.username;
        return res.redirect('/home');
    } catch (error) {
        console.error(error);
        return res.status(500).send("Server error while logging in.");
    }
});

app.get('/home', requireLogin, (req, res) => {
    res.render('home', { username: req.session.username });
});

// Logout route - destroys session and clears session cookie
app.get('/logout', (req, res) => {
    try {
        // destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.status(500).send('Error while logging out.');
            }

            // clear the cookie set by express-session
            res.clearCookie('connect.sid', { path: '/' });

            // redirect to home/login page
            return res.redirect('/');
        });
    } catch (err) {
        console.error('Logout error:', err);
        return res.status(500).send('Error while logging out.');
    }
});



// Authentication middleware: allow only logged-in users
function requireLogin(req, res, next) {
    if (req.session && req.session.username) {
        return next();
    }
    return res.redirect('/');
}


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


//  git push -u origin main  