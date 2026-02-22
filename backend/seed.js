const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Configuration
const DIRECTOR_EMAIL = "director@kgl.com";

const seedDirector = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB...");

        // Check if Director exists
        const existingDirector = await User.findOne({ email: DIRECTOR_EMAIL });

        if (existingDirector) {
            console.log("Director account already exists.");
            // Optional: Uncomment below to force reset password if they forgot it
            /*
            const hashedPassword = await bcrypt.hash(DIRECTOR_PASSWORD, 10);
            existingDirector.password = hashedPassword;
            await existingDirector.save();
            console.log("Director password has been RESET.");
            */
        } else {
            // Create new Director
            const hashedPassword = await bcrypt.hash(DIRECTOR_PASSWORD, 10);
            const director = new User({
                fullName: "Mr. Orban",
                email: DIRECTOR_EMAIL,
                password: hashedPassword,
                role: "Director",
            });

            await director.save();
            console.log("Director account created successfully!");
        }

        process.exit();
    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
};



seedDirector();

/**
 * Run the seed script again to update/create the Director account
 * node backend/seed.js
 * Note: If the Director already exists, 
 * we need to delete the user from the database first or 
 * update the script to overwrite the existing user.
 * 
 */