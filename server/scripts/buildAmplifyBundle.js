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
