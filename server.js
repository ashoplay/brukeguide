const { resolveInclude } = require("ejs");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt")
const multer = require('multer');
const path = require('path');

const Schema = mongoose.Schema
const uploads = multer({dest: "uploads/"})

require("dotenv").config();
app.set("view engine", "ejs");
app.use(express.static("public")); // Serve static files (CSS, JS, etc.)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/brukerguide").then(() => console.log("connected")).catch((error) => console.log("error", error));
const userSchema = new Schema({
  email: String,
  password: String
})

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("innlogging");
});
app.post("/login", (req, res) => {
  console.log(req.body)
});

app.get("/newguide", (req, res) => {
  res.render("newguide");
});
app.post("/newguide", uploads.single(), (req, res) => {
  console.log(req.body, "body")
  console.log(req.file, "file")
});

app.get("/guide", (req, res) => {
  res.render("guide");
});

app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

app.get("/signinn", (req, res) => {
  res.render("signinn")
});
app.post("/signinn", async (req, res) => {
  console.log(req.body)
  const { brukernavn, password, password2} = req.body;

  const newUser = new User({email: brukernavn, password})

  const result = await newUser.save();

  console.log(result);

  if(result._id) {
    res.redirect("/dashboard");
}});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');  
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  
  }
});

const upload = multer({ storage });

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.send(`Image uploaded: ${req.file.filename}`);
});
