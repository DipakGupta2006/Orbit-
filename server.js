require("dotenv").config();
const express = require("express");
const session = require("express-session");
const pool = require("./db");
const app = express();
const path = require('path');
const crypto = require('crypto');
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");

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
