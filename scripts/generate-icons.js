/**
 * Icon Generation Script
 * 
 * This script helps generate all required icon sizes from the SVG icon.
 * 
 * Prerequisites:
 * - Node.js installed
 * - sharp package: npm install sharp
 * 
 * Usage:
 * node scripts/generate-icons.js
 */

const fs = require('fs')
const path = require('path')

// Check if sharp is available
let sharp
try {
  sharp = require('sharp')
} catch (e) {
  console.error('❌ Error: sharp package not found')
  console.log('📦 Install it with: npm install sharp')
  console.log('   or: pnpm add sharp')
  process.exit(1)
}

const publicDir = path.join(__dirname, '..', 'public')
const svgPath = path.join(publicDir, 'icon.svg')

// Icon sizes to generate
const iconSizes = [
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'apple-icon.png', size: 180 },
  { name: 'icon-light-32x32.png', size: 32 },
  { name: 'icon-dark-32x32.png', size: 32 },
]

async function generateIcons() {
  if (!fs.existsSync(svgPath)) {
    console.error(`❌ SVG icon not found at: ${svgPath}`)
    console.log('📝 Please create icon.svg first')
    process.exit(1)
  }

  console.log('🎨 Generating icons from SVG...\n')

  try {
    const svgBuffer = fs.readFileSync(svgPath)

    for (const icon of iconSizes) {
      const outputPath = path.join(publicDir, icon.name)
      
      await sharp(svgBuffer)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath)

      console.log(`✅ Generated: ${icon.name} (${icon.size}x${icon.size})`)
    }

    console.log('\n✨ All icons generated successfully!')
    console.log('📁 Icons saved to: public/')
    console.log('\n💡 Next steps:')
    console.log('   1. Review the generated icons')
    console.log('   2. Adjust icon.svg if needed and regenerate')
    console.log('   3. Rebuild: pnpm build')
    console.log('   4. Deploy and test!')
  } catch (error) {
    console.error('❌ Error generating icons:', error.message)
    process.exit(1)
  }
}

generateIcons()
