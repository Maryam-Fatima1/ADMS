console.log("SERVER FILE LOADED ✅");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db"); // your file is config/db.js

// IMPORTANT: these names must match your routes folder files
const menuRoutes = require("./routes/menuRoutes");
const adminRoutes = require("./routes/adminRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/menu", menuRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Velvet Brew API is running ✅");
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
      console.log(`✅ Orders route: http://localhost:${PORT}/api/orders`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connect failed:", err.message);
  });
