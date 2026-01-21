# App Icon Setup Guide

This guide explains how to replace the app icons with your custom design.

## Required Icon Sizes

For a complete PWA setup, you need icons in the following sizes:

### Essential Icons
- **192x192** - Android home screen icon
- **512x512** - Android splash screen and high-res icon
- **180x180** - iOS home screen icon (apple-icon.png)
- **32x32** - Browser favicon (light and dark versions)
- **SVG** - Scalable vector icon (icon.svg)

## File Locations

Place your icon files in the `public/` directory:

```
public/
├── icon.svg              # Scalable vector icon
├── icon-light-32x32.png  # 32x32 favicon (light theme)
├── icon-dark-32x32.png   # 32x32 favicon (dark theme)
├── apple-icon.png        # 180x180 iOS icon
├── icon-192x192.png      # 192x192 Android icon
└── icon-512x512.png      # 512x512 Android splash icon
```

## Icon Design Guidelines

### Best Practices
1. **Square Design**: Icons should be square (1:1 aspect ratio)
2. **Padding**: Leave 10-20% padding around the icon content
3. **Simple Design**: Keep it simple and recognizable at small sizes
4. **High Contrast**: Ensure good visibility on light and dark backgrounds
5. **No Text**: Avoid text in icons (except single letters/initials)

### Color Guidelines
- Use your brand colors
- Ensure contrast for visibility
- Consider both light and dark theme variants

## Creating Icons

### Option 1: Online Icon Generators
1. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
   - Upload one high-res image (512x512 or larger)
   - Generates all required sizes automatically

2. **RealFaviconGenerator**: https://realfavicongenerator.net/
   - Generates all favicon sizes
   - Includes browser-specific optimizations

### Option 2: Design Tools
- **Figma**: Create icons and export at required sizes
- **Adobe Illustrator**: Design vector icons, export as PNG
- **Canva**: Use templates and export at specific sizes

### Option 3: AI Image Generators
- Use DALL-E, Midjourney, or similar to generate icon concepts
- Export and resize to required dimensions

## Quick Setup Steps

1. **Create Your Icon**
   - Design a 512x512 icon (or larger)
   - Export as PNG with transparent background

2. **Generate All Sizes**
   - Use PWA Asset Generator or resize manually:
     - 512x512 → `icon-512x512.png`
     - 192x192 → `icon-192x192.png`
     - 180x180 → `apple-icon.png`
     - 32x32 → `icon-light-32x32.png` and `icon-dark-32x32.png`
     - SVG → `icon.svg` (optional but recommended)

3. **Replace Files**
   - Copy all icon files to `public/` directory
   - Overwrite existing placeholder icons

4. **Test**
   - Build and deploy
   - Check icons appear correctly
   - Test on mobile devices

## Icon Naming Convention

The current setup uses:
- `icon-light-32x32.png` - Light theme favicon
- `icon-dark-32x32.png` - Dark theme favicon
- `apple-icon.png` - iOS icon (180x180)
- `icon.svg` - Scalable vector icon
- `icon-192x192.png` - Android standard icon (if added)
- `icon-512x512.png` - Android splash icon (if added)

## Updating Manifest

After adding new icon sizes, update `public/manifest.json` to include them:

```json
{
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## Testing Icons

1. **Local Testing**
   - Run `pnpm build && pnpm start`
   - Check browser tab favicon
   - Inspect manifest.json in DevTools

2. **Mobile Testing**
   - Deploy to production
   - Install as PWA
   - Verify home screen icon
   - Check splash screen (if configured)

3. **Validation**
   - Use Lighthouse PWA audit
   - Check PWA Builder: https://www.pwabuilder.com/

## Troubleshooting

### Icons Not Showing
- Clear browser cache
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Check file paths in manifest.json
- Verify files are in `public/` directory

### Wrong Icon Size
- Ensure exact pixel dimensions
- Use image editing software to resize
- Don't rely on CSS scaling

### iOS Icon Not Working
- Must be exactly 180x180 pixels
- File must be named `apple-icon.png`
- Check `app/layout.tsx` metadata

---

**Note**: After replacing icons, rebuild and redeploy for changes to take effect.
