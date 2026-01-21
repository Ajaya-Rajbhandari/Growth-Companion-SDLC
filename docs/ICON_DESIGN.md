# Icon Design Guide

## Current Icon Design

The app uses a modern, professional icon design featuring:

- **Gradient Background**: Blue to purple gradient (representing growth and productivity)
- **Checkmark Circle**: White circle with blue checkmark (task completion)
- **Upward Arrow**: White arrow pointing up (growth and progress)
- **Progress Dots**: Three dots representing steps/milestones

## Design Concept

The icon represents:
- ✅ **Completion** (checkmark)
- 📈 **Growth** (upward arrow)
- 🎯 **Progress** (dots)
- 💼 **Productivity** (clean, professional design)

## Customizing the Icon

### Option 1: Edit the SVG

Edit `public/icon.svg` to customize:
- Colors: Change the gradient stops
- Shape: Modify the paths and shapes
- Layout: Adjust positions and sizes

### Option 2: Use Design Tools

1. **Figma**:
   - Import `icon.svg`
   - Customize colors, shapes, text
   - Export as SVG

2. **Adobe Illustrator**:
   - Open `icon.svg`
   - Edit design
   - Export optimized SVG

3. **Online Editors**:
   - https://boxy-svg.com/ (browser-based)
   - https://vectr.com/ (free vector editor)

### Option 3: Create from Scratch

Design a 512x512 icon with:
- Simple, recognizable design
- High contrast
- Works at small sizes (32x32)
- Represents productivity/growth

## Generating PNG Icons

After customizing the SVG, generate all PNG sizes:

```bash
# Install sharp (if not already installed)
pnpm add sharp

# Generate all icon sizes
node scripts/generate-icons.js
```

Or use online tools:
- https://www.pwabuilder.com/imageGenerator
- Upload your SVG or 512x512 PNG
- Download all generated sizes

## Icon Color Schemes

### Current (Blue-Purple Gradient)
- Primary: `#3b82f6` (blue)
- Secondary: `#8b5cf6` (purple)
- Accent: White

### Alternative Schemes

**Green (Growth/Health)**
- Primary: `#10b981` (green)
- Secondary: `#059669` (dark green)

**Orange (Energy/Productivity)**
- Primary: `#f59e0b` (orange)
- Secondary: `#d97706` (dark orange)

**Red (Urgency/Focus)**
- Primary: `#ef4444` (red)
- Secondary: `#dc2626` (dark red)

## Design Tips

1. **Keep it Simple**: Complex designs don't scale well
2. **High Contrast**: Ensure visibility on all backgrounds
3. **Test at Small Sizes**: Check how it looks at 32x32
4. **Consistent Style**: Match your app's design language
5. **Unique**: Stand out from other productivity apps

## Quick Customization

To change colors in `icon.svg`, find these lines:

```xml
<!-- Change gradient colors -->
<stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
<stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />

<!-- Change checkmark color -->
<path ... stroke="#3b82f6" ... />
```

Replace the hex colors with your brand colors.

---

**Note**: After modifying the SVG, regenerate all PNG sizes using the script or online tools.
