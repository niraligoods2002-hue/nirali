const dns = require("dns");
const mongoose = require("mongoose");

// Fix querySrv ECONNREFUSED caused by ISPs / local network routers blocking SRV record lookups
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  // Ignore in environments where setting DNS servers is restricted
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ Database Connection Failed");
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

