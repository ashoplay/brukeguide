const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt"); // For password hashing
const multer = require("multer");
const path = require("path");
const app = express();

// Set the view engine to EJS
app.set("view engine", "ejs");

// Serve static files from the "public" directory
app.use(express.static("public"));

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, "./uploads")
  },
  filename: function (req, file, cb) {
      console.log(file);
      const ext = path.extname(file.originalname);
      console.log("EXT", ext);
      // if(ext !== ".png" || ext !== ".jpg") {
      //     return cb(new Error("Only PNG FILES allowed, stay away Martin!"))
      // } 
      const fileName = file.originalname + ".png"
      cb(null, fileName)
  }

})
const uploads = multer({
  storage: diskStorage,

})


// Connect to MongoDB database
mongoose.connect("mongodb://127.0.0.1:27017/brukerguide", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define MongoDB schema for users
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});

const User = mongoose.model("User", userSchema);

// Define MongoDB schema for guides
const guideSchema = new mongoose.Schema({
    title: String,
    tag: String,
    sections: [
        {
            overskrift: String,
            beskrivelse: String,
            bilde: String, // Filepath for image
        },
    ],
});

const Guide = mongoose.model("Guide", guideSchema);

// Routing for the home page
app.get("/", (req, res) => {
    res.render("index");
});

// Routing for the login page
app.get("/login", (req, res) => {
    res.render("innlogging");
});

// Routing for the guide page
app.get("/guide", async (req, res) => {
    const guides = await Guide.find(); // Fetch all guides from the database

    console.log(guides)
    res.render("guide", { guides });
});

// Handle login form submission
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempted by ${email}`);

    try {
        // Validate user
        const user = await User.findOne({ email: email });
        if (user && await bcrypt.compare(password, user.password)) {
            console.log(`User ${email} logged in successfully.`);
            res.redirect("/dashboard");  // Redirect to dashboard after successful login
        } else {
            console.log(`Invalid login attempt for ${email}.`);
            res.render("innlogging", { error: "Invalid email or password." });  // Render the login page with an error
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Routing for creating a new guide
app.get("/newguide", (req, res) => {
    res.render("newguide");
});

// Handle form submission for new guide
app.post("/newguide", uploads.single("bilde"), async (req, res) => {
    const { title, tag, overskrift, beskrivelse, bilde } = req.body;

    console.log(req.body, "GUIDE")
    
    // Create a new guide
    const newGuide = new Guide({
        title,
        tag,
        sections: [{
            overskrift,
            beskrivelse,
            bilde: req.file ? req.file.filename : "", // If there's an image, store the filename
        }],
    });

    if(title !== undefined) {

      
      try {
        await newGuide.save();
        console.log(`New guide created: ${title}`);
        res.redirect("/guide"); // Redirect to guide page after saving
      } catch (error) {
        console.error("Error creating guide:", error);
        res.status(500).send("Internal Server Error");
      }
    }
});

// Routing for the registration page
app.get("/signinn", (req, res) => {
    res.render("signinn");
});

// Handle POST request for registration
app.post("/signinn", async (req, res) => {
    const { email, password, password2 } = req.body;
    
    // Check if passwords match
    if (password !== password2) {
        return res.render("signinn", { error: "Passwords do not match." });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Save new user with hashed password
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        
        console.log(`New user registered: ${email}`);
        res.redirect("/dashboard");  // Redirect to dashboard after registration
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Routing for the dashboard page
app.get("/dashboard", (req, res) => {
    res.render("dashboard");
});

// Listen on port 3000
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
