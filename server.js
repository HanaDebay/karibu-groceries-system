//import libraries
const express = require("express");
const mongoose = require("mongoose");
const path = require("path")
const connectDB = require("./backend/config/db.js");


//import cors middleware
const cors = require("cors");

//loads environment variables form .env file
require("dotenv").config();

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined. Please check your .env file.");
}

// Import Routes
const userRoutes = require("./backend/routes/userRoutes");
const procurementRoutes = require("./backend/routes/procurementRoutes");
const salesRoutes = require("./backend/routes/salesRoutes");
const branchRoutes = require("./backend/routes/branchRoutes");

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./backend/config/swagger');



//create an express application
const app = express();


// Set Pug as template engine
app.set('view engine', 'pug');

// Set the folder where Pug templates are located
app.set('views', path.join(__dirname, 'frontend/views'));

//tells the express app to use CORS middleware
app.use(cors());

//adds middleware to parse incoming JSON request automatically
app.use(express.json());

// Serve static files from frontend/public
app.use(express.static(path.join(__dirname, 'frontend/public')));

//connect the application to mongoDB
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => console.log("MongoDB Connected"))
//   .catch((err) => console.error(err));

connectDB();


// API Routes
app.use("/api/users", userRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/branches", branchRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));





//start the server and listens for incoming requestes on specified port(5000)
app.listen(process.env.PORT, () => {
  console.log(`Server running on port http://localhost:${process.env.PORT}`);
});
