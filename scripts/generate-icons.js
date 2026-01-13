/**
 * Generate PWA icons from SVG source
 *
 * This script converts the logo.svg into all required PNG sizes for PWA
 *
 * Usage: node scripts/generate-icons.js
 *
 * Requires: sharp package (npm install --save-dev sharp)
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    // Try to import sharp
    const sharp = require('sharp');

    const svgPath = path.join(__dirname, '../public/logo.svg');
    const iconsDir = path.join(__dirname, '../public/icons');

    // Ensure icons directory exists
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Icon sizes needed for PWA
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

    console.log('🎨 Generating PWA icons from logo.svg...\n');

    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated ${size}x${size} icon`);
    }

    // Generate favicon (32x32)
    const faviconPath = path.join(__dirname, '../public/favicon.ico');
    await sharp(svgPath)
      .resize(32, 32)
      .png()
      .toFile(faviconPath);
    console.log(`✅ Generated favicon.ico`);

    // Generate Apple Touch Icon (180x180)
    const appleTouchPath = path.join(__dirname, '../public/apple-touch-icon.png');
    await sharp(svgPath)
      .resize(180, 180)
      .png()
      .toFile(appleTouchPath);
    console.log(`✅ Generated apple-touch-icon.png`);

    console.log('\n✨ All PWA icons generated successfully!');

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Error: "sharp" package not found.');
      console.error('\n📦 Please install it first:');
      console.error('   npm install --save-dev sharp');
      console.error('\nThen run this script again:');
      console.error('   node scripts/generate-icons.js\n');
      process.exit(1);
    } else {
      console.error('❌ Error generating icons:', error);
      process.exit(1);
    }
  }
}

generateIcons();
