const { resolveInclude } = require("ejs");
const express = require("express");
const app = express();
const mongoose = require("mongoose");

const Schema = mongoose.Schema

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

const user = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("index");
});
app.get("/login", (req, res) => {
  res.render("innlogging");
});
app.post("/login", (req, res) => {
  console.log(req.body)
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

  const newUser = new User({email: brukernavn, password, password})

  await newUser.save();

  console.log(result);

  if(result._id) {
    res.redirect("/dashboard");
}});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
