import * as THREE from 'three';
import { initViewer, setupResize, startRenderLoop, updateStatus } from './viewer/initViewer.js';
import { loadModel } from './viewer/loadModel.js';
import { applyHDRI, applyStudioLights, configureRenderer, addShadowCatcher } from './viewer/lighting.js';
import { setupScrollTimeline, applyStartPose, applyEndPose, createDebouncedRefresh } from './viewer/scrollTimeline.js';

/**
 * Main entry point
 */
async function init() {
  console.log('🚀 Initializing TruckVault Section Standalone...');

  // Get canvas
  const canvas = document.getElementById('three-canvas');
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  // Initialize Three.js
  const { scene, camera, cameraRig, renderer, controls, statusDiv } = initViewer(canvas);
  console.log('✅ Three.js initialized');

  // Configure renderer for professional rendering
  configureRenderer(renderer);

  // Setup resize handler
  setupResize(camera, renderer, canvas);

  // Start render loop
  startRenderLoop(renderer, scene, camera, controls);
  console.log('✅ Render loop started');

  // Create target proxy for scroll-driven camera target animation
  const targetProxy = { x: 0, y: 0, z: 0 };
  const applyTarget = (target) => {
    if (controls.enabled) {
      controls.target.set(target.x, target.y, target.z);
      controls.update();
    } else {
      camera.lookAt(target.x, target.y, target.z);
    }
  };

  // Expose pose helpers for keyboard shortcuts
  window.__applyPoseStart = () => applyStartPose(cameraRig, camera, targetProxy, applyTarget);
  window.__applyPoseEnd = () => applyEndPose(cameraRig, camera, targetProxy, applyTarget);

  // Load model
  let loadedModel = null;
  try {
    updateStatus(statusDiv, '⏳ Loading model...');
    const { model } = await loadModel('/assets/model.glb', scene);
    loadedModel = model;

    updateStatus(statusDiv, '✅ Model loaded');
  } catch (error) {
    console.warn('Missing model.glb. Add it to public/assets/ to view the model.');
    updateStatus(statusDiv, '❌ Model load failed');
    // Continue anyway with empty scene
  }

  // Apply HDRI environment lighting (with graceful fallback)
  try {
    updateStatus(statusDiv, '⏳ Loading HDRI...');
    await applyHDRI(renderer, scene, { intensity: 1.3 });
    updateStatus(statusDiv, '✅ HDRI loaded');
  } catch (error) {
    console.warn('HDRI not available, using studio lights only');
    updateStatus(statusDiv, '✅ Studio lights applied');
  }

  // Apply studio lighting rig (enhanced for vehicles)
  applyStudioLights(scene, {
    keyIntensity: 2.8,
    fillIntensity: 0.9,
    rimIntensity: 1.6,
    ambientIntensity: 0.2,
    shadowMapSize: 2048,
  });

  // Add shadow catcher plane below model
  if (loadedModel) {
    const bbox = new THREE.Box3().setFromObject(loadedModel);
    addShadowCatcher(scene, bbox.min.y - 0.02, 20);
  }

  // Apply start pose AFTER model + lighting are ready
  applyStartPose(cameraRig, camera, targetProxy, applyTarget);

  // Setup ScrollTrigger timeline with pose-based animation
  const timeline = setupScrollTimeline(cameraRig, camera, targetProxy, applyTarget);
  console.log('✅ ScrollTrigger timeline created (pose-based)');

  // Debounced refresh for layout shifts
  const debouncedRefresh = createDebouncedRefresh(300);

  // Refresh after model loads (layout may shift)
  window.addEventListener('load', debouncedRefresh);

  // Refresh on resize
  window.addEventListener('resize', debouncedRefresh);

  console.log('✅ Initialization complete');
  console.log('📜 Scroll down to see the animation');
  console.log('🎮 Controls: Mouse to rotate | Scroll to zoom | L/B/G keys for UI toggles');
  
  updateStatus(statusDiv, '✅ Ready');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
