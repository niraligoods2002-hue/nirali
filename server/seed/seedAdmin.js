require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/db");

async function seedAdmin() {
  try {
    // Use the same configured connection (including DNS handling) as the app.
    await connectDB();
    console.log("Connected to MongoDB");

    const adminEmail = "admin@luxora.com";
    const existing = await User.findOne({ email: adminEmail });

    if (existing) {
      // Ensure existing admin has admin role
      if (existing.role !== "admin") {
        existing.role = "admin";
        await existing.save();
        console.log("Existing admin user promoted to admin role");
      } else {
        console.log("Admin user already exists");
      }
    } else {
      await User.create({
        name: "Admin",
        email: adminEmail,
        password: "admin123", // will be hashed by pre-save hook
        role: "admin",
      });
      console.log("Admin user created:");
      console.log("  Email: admin@luxora.com");
      console.log("  Password: admin123");
    }

    await mongoose.disconnect();
    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seedAdmin();
