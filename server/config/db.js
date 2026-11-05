const dns = require("dns");
const mongoose = require("mongoose");

// Only set custom DNS servers in local non-production environments if needed (prevents breaking AWS VPC DNS)
if (!process.env.AWS_REGION && !process.env.AWS_EXECUTION_ENV && process.env.NODE_ENV !== "production") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch (err) {
    // Ignore in environments where setting DNS servers is restricted
  }
}

const DEFAULT_MONGO_URI =
  "mongodb+srv://niraligoods2002_db_user:mEyLcLKS5qs2gCvP@nirali.774xywy.mongodb.net/nirali?retryWrites=true&w=majority";

let dbConnectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (dbConnectionPromise) {
    return dbConnectionPromise;
  }

  const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
  dbConnectionPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 8_000,
    })
    .then((conn) => {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    })
    .catch((error) => {
      console.error("❌ Database Connection Warning:", error.message);
      dbConnectionPromise = null;
    });

  return dbConnectionPromise;
};

module.exports = connectDB;

