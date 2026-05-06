import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = path.join(root, "public");
const socialSrc = path.join(publicDir, "social-banner-teal.png");
const iconSrc = path.join(publicDir, "brand-icon-goat-chicken.png");

await mkdir(publicDir, { recursive: true });

await sharp(socialSrc)
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDir, "og-image.png"));

await sharp(iconSrc)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDir, "icon-512.png"));

await sharp(iconSrc)
  .resize(192, 192)
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDir, "icon-192.png"));

await sharp(iconSrc)
  .resize(180, 180)
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDir, "apple-touch-icon.png"));

await sharp(iconSrc)
  .resize(64, 64)
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDir, "favicon.png"));

console.log("Rendered public social and icon assets");
