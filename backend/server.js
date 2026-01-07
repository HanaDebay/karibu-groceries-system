//import libraries
const express = require("express");
const mongoose = require("mongoose");

//import cors middleware
const cors = require("cors");

//loads environment variables form .env file
require("dotenv").config();

//create an express application
const app = express();

//tells the express app to use CORS middleware
app.use(cors());

//adds middleware to parse incoming JSON request automatically
app.use(express.json());

//connect the application to mongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

//setup a simple get route for root URI
app.get("/", (req, res) => {
  res.send("Karibu Groceries API running");
});

//set the port the server will listen on
const PORT = process.env.PORT || 5000;

//start the server and listens for incoming requestes on specified port(5000)
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
