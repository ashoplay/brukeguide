const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");  // Legger til JWT for autentisering
const cookieParser = require("cookie-parser");  // For å håndtere cookies
const app = express();

const JWT_SECRET = "your_secret_key";  // Velg en sterk hemmelig nøkkel

// Set the view engine to EJS
app.set("view engine", "ejs");

// Serve static files from the "public" directory
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));  // Serve the uploads folder as static

// Parse JSON, URL-encoded data og cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, "./uploads")
  },
  filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const fileName = file.originalname + ".png";
      cb(null, fileName);
  }
});

const uploads = multer({
  storage: diskStorage,
});

mongoose.connect("mongodb://127.0.0.1:27017/brukerguide", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});

const User = mongoose.model("User", userSchema);

const guideSchema = new mongoose.Schema({
    title: String,
    tag: String,
    sections: [
        {
            overskrift: String,
            beskrivelse: String,
            bilde: String,
        },
    ],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // Legg til forfatter
});

const Guide = mongoose.model("Guide", guideSchema);

// Middleware for checking JWT
function isAuthenticated(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect("/login");
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;  // Legg brukerdata fra token i request-objektet
        next();
    } catch (error) {
        return res.redirect("/login");
    }
}

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    res.render("innlogging");
});

app.get("/guide", async (req, res) => {
    const guides = await Guide.find(); 
    res.render("guide", { guides });
});


app.get("/guide/:id", async (req, res) => {

    const id = req.params.id;
    const guide = await Guide.findById(id); 
    console.log(guide);
    res.render("guide", { guide });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email: email });
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
            res.cookie("token", token, { httpOnly: true });  // Sett token som cookie
            res.redirect("/dashboard");
        } else {
            res.render("innlogging", { error: "Invalid email or password." });
        }
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});

app.get("/newguide", isAuthenticated, (req, res) => {  // Beskyttet rute
    res.render("newguide");
});

app.post("/newguide", uploads.single("bilde"), isAuthenticated, async (req, res) => {
    const { title, tag, overskrift, beskrivelse } = req.body;

    const newGuide = new Guide({
        title,
        tag,
        sections: [{
            overskrift,
            beskrivelse,
            bilde: req.file ? req.file.filename : "",
        }],
        author: req.user.id  // Lagre brukerens ID som forfatter
    });

    try {
        await newGuide.save();
        res.redirect("/guide");
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});

app.get("/signinn", (req, res) => {
    res.render("signinn");
});

app.post("/signinn", async (req, res) => {
    const { email, password, password2 } = req.body;
    
    if (password !== password2) {
        return res.render("signinn", { error: "Passwords do not match." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.redirect("/dashboard");
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});

app.get("/dashboard", isAuthenticated, async (req, res) => {  // Beskyttet rute
    try {
        const userGuides = await Guide.find({ author: req.user.id });  // Hent guider laget av brukeren
        res.render("dashboard", { guides: userGuides });
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});

app.get("/logout", (req, res) => {
    res.clearCookie("token");  // Fjern JWT-token
    res.redirect("/login");
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
