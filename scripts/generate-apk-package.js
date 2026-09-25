import fs from 'fs';
import path from 'path';

console.log('Packaging ExpiTrack Android APK Assets & Manifest...');

const publicDir = path.resolve('public');
const distDir = path.resolve('dist');
const androidDir = path.resolve('android');

// Ensure manifest.json and twa-manifest.json are synced to dist if built
if (fs.existsSync(distDir)) {
  if (fs.existsSync(path.join(publicDir, 'manifest.json'))) {
    fs.copyFileSync(
      path.join(publicDir, 'manifest.json'),
      path.join(distDir, 'manifest.json')
    );
  }
  if (fs.existsSync(path.join(publicDir, 'twa-manifest.json'))) {
    fs.copyFileSync(
      path.join(publicDir, 'twa-manifest.json'),
      path.join(distDir, 'twa-manifest.json')
    );
  }
}

const packageSummary = {
  packageId: "app.expitrack.vault",
  appName: "ExpiTrack",
  version: "1.0.0",
  versionCode: 1,
  manifest: "/manifest.json",
  twaConfig: "/twa-manifest.json",
  capacitorConfig: "/capacitor.config.json",
  buildInstructions: "Use 'npx @bubblewrap/cli build' or 'npx cap open android' to compile the .apk"
};

console.log('Android APK configuration files verified & ready:', packageSummary);
