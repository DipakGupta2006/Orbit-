require("dotenv").config();

const express = require("express");
const session = require("express-session");
const pool = require("./db");
const app = express();

const path = require("path");
const crypto = require("crypto");

const Groq = require("groq-sdk");

const port = process.env.PORT || 3000;


// ---------- GROQ AI SETUP ----------

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});



// ---------- MIDDLEWARE ----------

app.use(express.static("public"));

app.use('/css', express.static(path.join(__dirname, 'styles')));

app.use('/js', express.static(path.join(__dirname, 'js')));


app.use(express.urlencoded({ extended: true }));

app.use(express.json());


app.set("view engine", "ejs");




// ---------- SESSION ----------

app.use(session({

    secret: process.env.SESSION_SECRET || "keyboard cat",

    resave:false,

    saveUninitialized:false,

    cookie:{
        maxAge:1000 * 60 * 60
    }

}));





// ---------- HOME ----------

app.get('/', (req,res)=>{

    res.sendFile(
        path.join(__dirname,'public','index.html')
    );

});





// ---------- ORBIT AI CHAT API ----------

app.post("/api/chat", async(req,res)=>{


    const message = req.body.message?.trim();


    if(!message){

        return res.status(400).json({

            error:"Message is required"

        });

    }



    try{


        const completion =
        await groq.chat.completions.create({


            model:"llama-3.3-70b-versatile",


            messages:[

                {
                    role:"system",
                    content:
                    "You are Orbit AI, a helpful AI assistant."
                },


                {
                    role:"user",
                    content:message
                }

            ]


        });



        const reply =
        completion.choices[0].message.content;



        res.json({

            reply:reply

        });



    }
    catch(error){


        console.error(
            "Groq Error:",
            error
        );


        res.status(500).json({

            error:"AI response failed"

        });


    }


});






// ---------- PASSWORD HASH ----------

function hashPassword(password){

    return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

}







// ---------- REGISTER ----------

app.post("/register", async (req,res)=>{


    const {
        username,
        email,
        password,
        confirm_password
    } = req.body;



    if(!username || !email || !password || !confirm_password){

        return res.status(400)
        .send("Please fill all fields.");

    }



    if(password !== confirm_password){

        return res.status(400)
        .send("Passwords do not match.");

    }



    try{


        const hashedPassword =
        hashPassword(password);



        await pool.query(

            "INSERT INTO users (username,email,password) VALUES (?,?,?)",

            [
                username,
                email,
                hashedPassword
            ]

        );



        return res.redirect("/");


    }
    catch(error){


        if(error.code==="ER_DUP_ENTRY"){

            return res.status(400)
            .send("Email already registered.");

        }


        console.error(error);


        return res.status(500)
        .send("Server error while registering.");

    }


});








// ---------- LOGIN ----------

app.post("/login", async(req,res)=>{


    const {
        username,
        password
    } = req.body;



    if(!username || !password){

        return res.status(400)
        .send("Please enter username and password.");

    }



    try{


        const [rows] =
        await pool.query(

            "SELECT * FROM users WHERE username=? LIMIT 1",

            [username]

        );



        if(rows.length===0){

            return res.status(401)
            .send("Invalid username or password.");

        }



        const user=rows[0];



        const hashedPassword =
        hashPassword(password);



        if(user.password !== hashedPassword){

            return res.status(401)
            .send("Invalid username or password.");

        }



        req.session.username =
        user.username;



        return res.redirect("/home");


    }
    catch(error){


        console.error(error);


        return res.status(500)
        .send("Server error while logging in.");

    }


});








// ---------- HOME PAGE ----------

app.get('/home', requireLogin,(req,res)=>{


    res.render(
        'home',
        {
            username:req.session.username
        }
    );


});








// ---------- LOGOUT ----------

app.get('/logout',(req,res)=>{


    req.session.destroy((err)=>{


        if(err){

            console.error(err);

            return res.status(500)
            .send("Error while logging out.");

        }



        res.clearCookie('connect.sid');


        res.redirect("/");


    });


});








// ---------- AUTH MIDDLEWARE ----------

function requireLogin(req,res,next){


    if(req.session && req.session.username){

        return next();

    }


    return res.redirect("/");

}








app.listen(port,()=>{


    console.log(
        `Server running on port ${port}`
    );


});