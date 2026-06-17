// require("dotenv").config();
const express = require("express");
// const session = require("express-session");
// const pool = require("./db");
const app = express();
const path = require('path');
// const crypto = require('crypto');
// const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.get('/', (req, res) => {
    res.send('hello')
})


app.listen(5000, () => {
    console.log(`Server running on port 5000`);
});
