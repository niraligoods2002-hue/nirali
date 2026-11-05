const fs = require("fs");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(appRoot, ".amplify-hosting");
const computeRoot = path.join(outputRoot, "compute", "default");
const runtimeFiles = [
  "server.js",
  "package.json",
  "assets",
  "config",
  "controllers",
  "middleware",
  "models",
  "node_modules",
  "public",
  "routes",
  "utils",
  "views",
];

for (const entry of runtimeFiles) {
  if (!fs.existsSync(path.join(appRoot, entry))) {
    throw new Error(`Amplify bundle is missing required runtime path: ${entry}`);
  }
}

if (!fs.existsSync(path.join(appRoot, "node_modules", "express", "package.json"))) {
  throw new Error("Server dependencies are missing. Run npm ci --omit=dev --workspaces=false from server/.");
}

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(computeRoot, { recursive: true });

for (const entry of runtimeFiles) {
  fs.cpSync(path.join(appRoot, entry), path.join(computeRoot, entry), {
    recursive: true,
    filter: (source) => !source.split(path.sep).some((part) => part === ".env" || part.startsWith(".env.")),
  });
}

// Generate runtime .env for Amplify compute environment from build-time environment
const runtimeEnvKeys = [
  "PORT",
  "NODE_ENV",
  "PUBLIC_BASE_URL",
  "MONGO_URI",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "IMAGEKIT_PUBLIC_KEY",
  "IMAGEKIT_PRIVATE_KEY",
  "IMAGEKIT_URL_ENDPOINT",
  "EMAIL_USER",
  "EMAIL_PASS",
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_SECURE",
  "EMAIL_FROM",
  "BREVO_API_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_SMS_FROM",
  "TWILIO_WHATSAPP_FROM",
  "TWILIO_WHATSAPP_CONTENT_SID",
];

const localEnvPath = path.join(appRoot, ".env");
const localEnv = {};
if (fs.existsSync(localEnvPath)) {
  const content = fs.readFileSync(localEnvPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      localEnv[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
}

const envLines = ["# AWS Amplify Compute Runtime Environment"];
for (const key of runtimeEnvKeys) {
  const value = process.env[key] || localEnv[key];
  if (value !== undefined && value !== "") {
    envLines.push(`${key}=${value}`);
  }
}

fs.writeFileSync(path.join(computeRoot, ".env"), envLines.join("\n") + "\n", "utf-8");

fs.copyFileSync(
  path.join(appRoot, "deploy-manifest.json"),
  path.join(outputRoot, "deploy-manifest.json"),
);

function directorySize(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const absolutePath = path.join(directory, entry.name);
    return total + (entry.isDirectory() ? directorySize(absolutePath) : fs.statSync(absolutePath).size);
  }, 0);
}

const bundleSizeMb = directorySize(outputRoot) / (1024 * 1024);
console.log(`Amplify deployment bundle created (${bundleSizeMb.toFixed(1)} MB uncompressed).`);
if (bundleSizeMb > 220) {
  throw new Error("Amplify compute bundle exceeds the 220 MB uncompressed limit.");
}
