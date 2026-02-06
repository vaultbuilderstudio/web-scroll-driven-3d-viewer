# TruckVault Section - Standalone Demo

Standalone reproduction of a pinned scroll section from `https://bsa-stage-truck-vault.pantheonsite.io/` using Three.js + GSAP ScrollTrigger.

## What It Is

This demo recreates a scroll-linked 3D viewer section with:
- **Three.js** for WebGL rendering
- **GSAP ScrollTrigger** for scroll-based animations
- **Vite** for fast development and bundling
- **Playwright** for automated asset capture from target site

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Copy Model File
Copy a GLB model to `public/assets/ford_expid_24_v2.glb`:
```bash
# From project root, if model exists in parent workspace:
cp ../../../model/web_ready_vehicle_15.glb public/assets/ford_expid_24_v2.glb
```

### 3. Run Development Server
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 4. Build for Production
```bash
npm run build
npm run preview
```

## Capture Target Section

To capture HTML, CSS, and assets from the target website:

### 1. Configure Target
Edit `../capture/CONFIG.md` or `../tools/capture_section.mjs` to set:
- `TARGET_URL`
- `TARGET_SELECTOR` (e.g., `.hero-3d`, `#vault-section`)

### 2. Run Capture Script
```bash
npm run capture
```

This will output to `../capture/`:
- `section.outer.html` - Section HTML
- `page.links.json` - All CSS/JS/font URLs
- `section.computed.json` - Computed styles
- `section.screenshot.png` - Visual reference
- `manifest.json` - Capture metadata

### 3. Integrate Captured Assets
1. Copy relevant HTML from `section.outer.html` into `index.html`
2. Extract CSS tokens and component styles into `src/styles.css`
3. Map GSAP timeline settings (pin distance, scrub values) in `src/viewer/scrollTimeline.js`
4. Adjust camera rotation values in `scrollTimeline.js` CONFIG

## Project Structure

```
standalone/
├── index.html              # Main HTML entry
├── package.json            # Scripts and dependencies
├── public/
│   └── assets/
│       └── ford_expid_24_v2.glb       # 3D model file
├── src/
│   ├── main.js             # Entry point
│   ├── styles.css          # Styles (integrate captured CSS here)
│   └── viewer/
│       ├── initViewer.js   # Three.js scene setup
│       ├── loadModel.js    # GLB loader
│       └── scrollTimeline.js # GSAP ScrollTrigger config
├── README.md               # This file
└── TECH_NOTES.md           # Technical details and tweakable values
```

## Configuration

Edit `src/viewer/scrollTimeline.js` to adjust:
- `CAMERA_START_ROTATION` / `CAMERA_END_ROTATION` - Camera rotation range
- `PIN_DISTANCE` - How far to scroll through pinned section (e.g., `"+=200%"`)
- `SCRUB_SMOOTHING` - Smoothing lag in seconds (e.g., `1`)
- `DEBUG` - Enable ScrollTrigger visual markers

## Troubleshooting

**Model doesn't load:**
- Ensure `public/assets/ford_expid_24_v2.glb` exists
- Check browser console for errors
- Try a different GLB model from workspace

**Section doesn't pin:**
- Check `sectionSelector` in `scrollTimeline.js`
- Verify section has enough height
- Enable `DEBUG: true` to see ScrollTrigger markers

**Capture script fails:**
- Update `TARGET_SELECTOR` in `tools/capture_section.mjs`
- Target site may have changed structure
- Check `../capture/manifest.json` for error details

## Next Steps

1. Run `npm run capture` to extract target section
2. Integrate captured HTML into `index.html`
3. Extract CSS tokens and styles into `styles.css`
4. Adjust camera and ScrollTrigger values to match target behavior
5. Replace placeholder model with actual asset

See `TECH_NOTES.md` for detailed technical information.
