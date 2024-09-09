const express = require("express");
const app = express();

require("dotenv").config();

app.set("view engine", "ejs");
app.use(express.static("public")); // Serve static files (CSS, JS, etc.)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index");
});
app.get("/login", (req, res) => {
  res.render("innlogging");
});
app.get("/guide", (req, res) => {
  res.render("guide");
});
app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
