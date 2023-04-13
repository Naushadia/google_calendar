var createError = require("http-errors");
var path = require('path');
var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var bodyParser = require("body-parser");
var dotenv = require("dotenv");

dotenv.config("./.env");

var db = require("./models");

var eventsRouter = require("./routes/event");

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger("common"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/events", eventsRouter);

var PORT = process.env.PORT;

app.listen(PORT);

module.exports = app;
