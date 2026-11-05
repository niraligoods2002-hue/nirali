const dns = require("dns");
const mongoose = require("mongoose");

// Fix querySrv ECONNREFUSED caused by ISPs / local network routers blocking SRV record lookups
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  // Ignore in environments where setting DNS servers is restricted
}

const DEFAULT_MONGO_URI =
  "mongodb+srv://niraligoods2002_db_user:mEyLcLKS5qs2gCvP@nirali.774xywy.mongodb.net/nirali?retryWrites=true&w=majority";

const connectDB = async () => {
  const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("❌ Database Connection Warning:", error.message);
    // Never call process.exit(1) in a serverless/cloud runtime, as it crashes the entire container
  }
};

module.exports = connectDB;

