import fs from "fs";
import path from "path";
import sharp from "sharp";

async function generate() {
  const svgPath = path.resolve("./public/icon.svg");
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve("./public/pwa-192x192.png"));

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve("./public/icon-192.png"));

  // 2. 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve("./public/pwa-512x512.png"));

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve("./public/icon-512.png"));

  // 3. Apple touch icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.resolve("./public/apple-touch-icon.png"));

  // 4. Maskable icon with 15% padding
  const innerSize = Math.round(512 * 0.8);
  const innerBuffer = await sharp(svgBuffer).resize(innerSize, innerSize).png().toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 11, g: 15, b: 25, alpha: 1 }
    }
  })
    .composite([{ input: innerBuffer, gravity: "center" }])
    .png()
    .toFile(path.resolve("./public/pwa-maskable-512x512.png"));

  console.log("PWA Icons generated successfully!");
}

generate().catch(console.error);
