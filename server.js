const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();

const JWT_SECRET = "your_secret_key"; // Velg en sterk hemmelig nøkkel

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
      cb(null, "./uploads");
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

mongoose.connect("mongodb://127.0.0.1:27017/brukerguide");

// User schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});

const User = mongoose.model("User", userSchema);

// Guide schema
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
        req.user = decoded;
        next();
    } catch (error) {
        return res.redirect("/login");
    }
}

// Hent guider til forsiden
app.get("/", async (req, res) => {
    try {
        const guides = await Guide.find();
        res.render("index", { guides });
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});

// Logg inn ruter
app.get("/login", (req, res) => {
    res.render("innlogging");
});

// Sign in route
app.get("/signinn", (req, res) => {
    res.render("signinn");
});

// Handle user registration
app.post("/signinn", async (req, res) => {
    const { email, password, password2 } = req.body;

    // Check if passwords match
    if (password !== password2) {
        return res.render("signinn", { error: "Passordene må matche." });
    }

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render("signinn", { error: "E-post er allerede registrert." });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });

        await newUser.save();
        res.redirect("/login"); // Redirect to login after successful registration
    } catch (error) {
        console.error(error);
        res.status(500).send("Intern serverfeil");
    }
});

// Handle user login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
            res.cookie("token", token, { httpOnly: true });
            res.redirect("/dashboard");
        } else {
            res.render("innlogging", { error: "Ugyldig e-post eller passord." });
        }
    } catch (error) {
        res.status(500).send("Intern serverfeil");
    }
});

// Lag ny guide
app.get("/newguide", isAuthenticated, (req, res) => {
    res.render("newguide");
});

app.post("/newguide", uploads.array("bilde"), isAuthenticated, async (req, res) => {
    const { title, tag, overskrift, beskrivelse } = req.body;
    const sectionsarray = [];

    if (Array.isArray(overskrift)) {
        for (let index = 0; index < overskrift.length; index++) {
            sectionsarray.push({
                overskrift: overskrift[index],
                beskrivelse: beskrivelse[index],
                bilde: req.files[index] ? req.files[index].path : ""
            });
        }
    } else {
        sectionsarray.push({
            overskrift,
            beskrivelse,
            bilde: req.files[0] ? req.files[0].path : ""
        });
    }

    const newGuide = new Guide({
        title,
        tag,
        sections: sectionsarray,
        author: req.user.id
    });

    try {
        await newGuide.save();
        res.redirect(`/guide/${newGuide._id}`);
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});

// Hent guider på dashboard (brukerens egne guider)
app.get("/dashboard", isAuthenticated, async (req, res) => {
    try {
        const userGuides = await Guide.find({ author: req.user.id });
        res.render("dashboard", { guides: userGuides });
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});

app.get("/guide/:id", async (req, res) => {
    try {
        const guide = await Guide.findById(req.params.id);
        if (!guide) {
            return res.status(404).send("Guide ikke funnet");
        }
        res.render("guide", { guide });
    } catch (error) {
        console.log(error);
        res.status(500).send("Intern serverfeil");
    }
});

// Rediger en guide
app.get("/guide/:id/edit", isAuthenticated, async (req, res) => {
    const guide = await Guide.findById(req.params.id);
    if (!guide || guide.author.toString() !== req.user.id) {
        return res.status(403).send("Du har ikke tilgang til å redigere denne guiden.");
    }
    res.render("editguide", { guide });
});

app.post("/guide/:id/edit", uploads.array("bilde"), isAuthenticated, async (req, res) => {
    const guide = await Guide.findById(req.params.id);
    if (!guide || guide.author.toString() !== req.user.id) {
        return res.status(403).send("Du har ikke tilgang til å redigere denne guiden.");
    }

    const { title, tag, overskrift, beskrivelse } = req.body;
    const sectionsarray = [];

    if (Array.isArray(overskrift)) {
        for (let index = 0; index < overskrift.length; index++) {
            sectionsarray.push({
                overskrift: overskrift[index],
                beskrivelse: beskrivelse[index],
                bilde: req.files[index] ? req.files[index].path : guide.sections[index]?.bilde || ""
            });
        }
    } else {
        sectionsarray.push({
            overskrift,
            beskrivelse,
            bilde: req.files[0] ? req.files[0].path : guide.sections[0]?.bilde || ""
        });
    }

    guide.title = title;
    guide.tag = tag;
    guide.sections = sectionsarray;

    try {
        await guide.save();
        res.redirect(`/guide/${guide._id}`);
    } catch (error) {
        res.status(500).send("Intern serverfeil");
    }
});

// Slett en guide
app.post("/guide/:id/delete", isAuthenticated, async (req, res) => {
    const guide = await Guide.findById(req.params.id);
    if (!guide || guide.author.toString() !== req.user.id) {
        return res.status(403).send("Du har ikke tilgang til å slette denne guiden.");
    }

    try {
        await guide.remove();
        res.redirect("/dashboard");
    } catch (error) {
        res.status(500).send("Intern serverfeil");
    }
});

// Logg ut
app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

// Start serveren
app.listen(3000, () => {
    console.log("Server kjører på http://localhost:3000");
});
