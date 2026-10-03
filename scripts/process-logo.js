import sharp from "sharp";
import fs from "fs";
import path from "path";

const inputImage = path.resolve("src/assets/images/memora_gold_medallion_1789862985153.jpg");
const publicDir = path.resolve("public");

async function processLogo() {
  console.log("Reading image:", inputImage);
  const metadata = await sharp(inputImage).metadata();
  console.log("Dimensions:", metadata.width, "x", metadata.height);

  // 1. High-Res PNG master
  await sharp(inputImage)
    .resize(1024, 1024, { fit: "cover" })
    .png({ quality: 95 })
    .toFile(path.join(publicDir, "logo-official.png"));
  console.log("Created logo-official.png");

  // 2. Circular / Rounded badge for UI embedding
  const circleSvg = Buffer.from(
    '<svg width="512" height="512"><circle cx="256" cy="256" r="256" fill="#fff" /></svg>'
  );
  await sharp(inputImage)
    .resize(512, 512, { fit: "cover" })
    .composite([{ input: circleSvg, blend: "dest-in" }])
    .png()
    .toFile(path.join(publicDir, "logo-round.png"));
  console.log("Created logo-round.png");

  // 3. PWA standard icons
  await sharp(inputImage)
    .resize(192, 192, { fit: "cover" })
    .png()
    .toFile(path.join(publicDir, "pwa-192x192.png"));
  await sharp(inputImage)
    .resize(192, 192, { fit: "cover" })
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));

  await sharp(inputImage)
    .resize(512, 512, { fit: "cover" })
    .png()
    .toFile(path.join(publicDir, "pwa-512x512.png"));
  await sharp(inputImage)
    .resize(512, 512, { fit: "cover" })
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));

  // 4. Apple Touch Icon (180x180)
  await sharp(inputImage)
    .resize(180, 180, { fit: "cover" })
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));

  // 5. Maskable Icon with 15% safe padding
  const paddedSize = Math.round(512 * 0.76); // 389px inside 512px
  const resizedForMask = await sharp(inputImage)
    .resize(paddedSize, paddedSize, { fit: "cover" })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 11, g: 15, b: 25, alpha: 1 }, // #0B0F19 brand background
    },
  })
    .composite([{ input: resizedForMask, gravity: "center" }])
    .png()
    .toFile(path.join(publicDir, "pwa-maskable-512x512.png"));

  console.log("All PWA and UI icons successfully generated!");
}

processLogo().catch((err) => {
  console.error("Error processing logo:", err);
  process.exit(1);
});
