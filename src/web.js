const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "/public")));

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.get("/", function (req, res) {
  res.render("home");
});

app.listen(8080, (req, res) => {
  Host: process.env.NODE_ENV !== "production" ? "localhost" : "0.0.0.0";
});
