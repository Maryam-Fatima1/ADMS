require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = "admin@velvetbrew.com";
  const password = "Admin123";

  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log("Admin already exists");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.create({ email, passwordHash });

  console.log("Admin created:");
  console.log("Email:", email);
  console.log("Password:", password);

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
