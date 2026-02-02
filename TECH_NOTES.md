# Technical Notes - TV Section Standalone

## Existing Local Demo Summary

### Renderer: Google Model Viewer v3.5.0
- **Technology**: `<model-viewer>` web component (wrapper around Three.js)
- **Model Format**: GLB files from `http://localhost:8000/model/web_ready_vehicle_5.glb`
- **Key Attributes**:
  - `camera-orbit="270deg 60deg 70%"` - static starting position (rear view, 60° elevation, 70% distance)
  - `camera-controls` - enables user drag/pan/zoom
  - `interaction-prompt="none"` - disables hand animation
  - `interpolation-decay="10"` - fast camera snap (10ms)
  - `disable-tap` - prevents tap-to-recenter

### Scroll → Camera Orbit Logic
**Location**: Lines 420-436 in 3D_VIEWER_LOCAL_TEST.html

```javascript
window.addEventListener('scroll', () => {
    if (!isUserInteracting) {
        const scrollProgress = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        const clampedProgress = Math.max(0, Math.min(1, scrollProgress));
        
        // Rotate from 270deg (rear view) to 380deg (20deg past rear) as user scrolls
        const theta = 270 + (clampedProgress * 110);
        modelViewer.cameraOrbit = `${theta}deg 60deg 70%`;
    }
});
```

**Key Pattern**: Maps scroll progress (0-1) to theta rotation (270°→380°)

### User Interaction Lockout
**Location**: Lines 438-444

```javascript
modelViewer.addEventListener('camera-change', (event) => {
    if (event.detail.source === 'user-interaction') {
        isUserInteracting = true;
        setTimeout(() => { isUserInteracting = false; }, 1000);
    }
});
```

**Reusable Pattern**: Detects manual camera manipulation and pauses scroll-based animation for 1 second.

### Custom Wheel Event Dampening
**Location**: Lines 357-407
- **scrollDampening**: 0.3 (reduces scroll movement by 70%)
- **scrollDuration**: 250ms
- **Easing**: Cubic ease-in-out
- **DeltaMode Normalization**: Handles pixel (×0.5), line (×1), page (×20) modes

**Reusable**: This pattern improves scroll feel but is **independent** of camera animation. Can be reused for smoother page scrolling.

### Local Assets Available
- **Models**: `/model/web_ready_vehicle_[1-5].glb` (5 variants)
- **Textures**: `/textures/` directory (need to inspect)
- **Images**: `/images/` directory (need to inspect)

## Target Section Capture Plan

### Target URL
`https://bsa-stage-truck-vault.pantheonsite.io/`

### Section Selector
_TBD - To be determined after inspecting target page_

Candidates to look for:
- Sections with class patterns like `.hero-3d`, `.scroll-section`, `.vault-viewer`
- Sections containing canvas elements
- Sections with `data-scroll-section` or similar scroll framework attributes

### Capture Requirements
1. **DOM**: Section outerHTML including all child nodes
2. **CSS**: Computed styles for section root + major children
3. **JS Behaviors**: Scroll pin/scrub settings, GSAP timeline configuration
4. **Assets**: Background images, model files, fonts

## Known Gaps & Assumptions

### Assumptions
1. Target site likely uses GSAP ScrollTrigger (industry standard for scroll-linked animations)
2. May use Three.js directly (not model-viewer) for more control
3. Section may be pinned while scrubbing through animation timeline
4. Camera rotation likely tied to scroll progress via GSAP timeline

### Manual Capture Needed
- **Fonts**: If custom web fonts used, may need manual extraction
- **Model Files**: If proprietary GLB models, may need placeholder
- **JS Logic**: Complex state machines or custom scroll frameworks require manual recreation

## Tweakable Constants (To Be Configured)

### Camera Animation
- `CAMERA_START_ROTATION`: Initial rig rotation (degrees or radians)
- `CAMERA_END_ROTATION`: Final rig rotation
- `CAMERA_POSITION`: Static camera position in rig
- `CAMERA_FOV`: Field of view

### ScrollTrigger Settings
- `PIN_DISTANCE`: e.g., `"+=200%"` (scroll 2x viewport height through pinned section)
- `SCRUB_SMOOTHING`: e.g., `1` (1-second smoothing lag)
- `TRIGGER_START`: e.g., `"top top"` (when section top hits viewport top)
- `TRIGGER_END`: e.g., `"+=200%"` (end after scrolling 200% of viewport)

### Performance
- `RENDER_SCALE`: DPR multiplier for quality vs performance
- `ANTIALIAS`: true/false

## Migration from Model-Viewer to Three.js

The existing demo uses `<model-viewer>` (high-level). The standalone will use **Three.js directly** for more control over GSAP integration.

**Key Differences**:
| Model Viewer | Three.js Direct |
|--------------|-----------------|
| `camera-orbit="270deg 60deg 70%"` | `camera.position.set(x,y,z)` in camera rig |
| `modelViewer.cameraOrbit = ...` | `cameraRig.rotation.y = ...` via GSAP |
| Built-in controls | OrbitControls or custom |
| Simple setup | More boilerplate, more control |

**Migration Path**:
1. Create Three.js scene + camera + renderer
2. Load GLB via GLTFLoader
3. Wrap camera in rig Object3D
4. Animate `cameraRig.rotation.y` with GSAP ScrollTrigger
5. Implement interaction lockout similar to existing pattern

## Refresh Strategy (Layout Shifts)

ScrollTrigger needs refresh when layout changes:
- After model loads (bounding box known)
- After images load (section height stabilizes)
- After fonts load (text reflow)
- On window resize (debounced)

**Pattern**:
```javascript
const refreshScrollTrigger = debounce(() => {
  ScrollTrigger.refresh();
}, 300);

model.addEventListener('load', refreshScrollTrigger);
window.addEventListener('resize', refreshScrollTrigger);
```

## Next Steps
1. Run capture tool against target URL
2. Analyze captured HTML structure
3. Extract CSS tokens and component styles
4. Map GSAP ScrollTrigger configuration
5. Implement standalone with Three.js + GSAP
