import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Camera poses for scroll-driven animation
 * Use Pose Capture workflow (press O to enable OrbitControls, P to print pose) to set these
 * camLocalPos is the camera position relative to the rig (z controls zoom/dolly)
 */
export const POSES = {
  START: {
    rigPos: { x: 0, y: 0, z: 0 },
    rigRot: { x: 0, y: 0.0767, z: 0 },
    camLocalPos: { x: 5.980239, y: 1.034926, z: 5.20704 },
    target: { x: -0.196162, y: 0.000054, z: 0.208513 },
    fov: 30
  },
  END: {
    rigPos: { x: 0, y: 0, z: 0 },
    rigRot: { x: 0, y: 0.0767, z: 0 },
    camLocalPos: { x: -0.451684, y: 0.210539, z: 5.422854 },
    target: { x: 0.048933, y: 0.014605, z: 0.111806 },
    fov: 30
  }
};

/**
 * Configuration constants
 */
export const CONFIG = {
  // ScrollTrigger settings
  PIN_DISTANCE: '+=200%', // Scroll 200% of viewport height through section
  SCRUB_SMOOTHING: true, // Lock animation to scroll
  TRIGGER_START: 'top top',
  TRIGGER_END: '+=200%',

  // Debug
  DEBUG: false,
};

/**
 * Apply a pose to camera rig and target
 * @param {THREE.Object3D} cameraRig - Camera rig
 * @param {THREE.PerspectiveCamera} camera - Camera object
 * @param {Object} targetProxy - Target proxy object {x,y,z}
 * @param {Function} applyTarget - Function to apply target to controls/camera
 * @param {Object} pose - Pose object with rigPos, rigRot, camLocalPos, target, fov
 */
export function applyPose(cameraRig, camera, targetProxy, applyTarget, pose) {
  if (!pose) {
    return;
  }
  gsap.set(cameraRig.position, pose.rigPos);
  gsap.set(cameraRig.rotation, pose.rigRot);
  
  // Apply camera local position (zoom/dolly)
  if (pose.camLocalPos) {
    gsap.set(camera.position, pose.camLocalPos);
  }
  
  // Apply FOV if specified
  if (pose.fov !== undefined) {
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
  }
  
  // Apply target
  Object.assign(targetProxy, pose.target);
  if (applyTarget) {
    applyTarget(targetProxy);
  }
}

export function applyStartPose(cameraRig, camera, targetProxy, applyTarget) {
  applyPose(cameraRig, camera, targetProxy, applyTarget, POSES.START);
  console.log('📷 Start pose applied');
}

export function applyEndPose(cameraRig, camera, targetProxy, applyTarget) {
  applyPose(cameraRig, camera, targetProxy, applyTarget, POSES.END);
  console.log('��� End pose applied');
}

/**
 * Setup GSAP ScrollTrigger timeline with pose-based animation
 * Animates position, rotation, camera zoom (local position), and target
 * @param {THREE.Object3D} cameraRig - Camera rig to animate
 * @param {THREE.PerspectiveCamera} camera - Camera object
 * @param {Object} targetProxy - Target proxy object {x,y,z}
 * @param {Function} applyTarget - Function to apply target (controls.target or camera.lookAt)
 * @param {string} sectionSelector - CSS selector for pinned section
 */
export function setupScrollTimeline(cameraRig, camera, targetProxy, applyTarget, sectionSelector = '#viewer-section') {
  const section = document.querySelector(sectionSelector);
  
  if (!section) {
    console.error(`Section "${sectionSelector}" not found`);
    return null;
  }

  // Create timeline
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: CONFIG.TRIGGER_START,
      end: CONFIG.TRIGGER_END,
      pin: true,
      anticipatePin: 1,
      scrub: CONFIG.SCRUB_SMOOTHING,
      markers: CONFIG.DEBUG,
      onUpdate: (self) => {
        if (CONFIG.DEBUG) {
          console.log('Scroll progress:', self.progress.toFixed(3));
        }
      },
    },
  });

  // Animate rig position
  tl.to(cameraRig.position, {
    ...POSES.END.rigPos,
    ease: 'none'
  }, 0);

  // Animate rig rotation
  tl.to(cameraRig.rotation, {
    ...POSES.END.rigRot,
    ease: 'none'
  }, 0);

  // Animate camera local position (zoom/dolly) - CRITICAL for exact view
  if (POSES.END.camLocalPos) {
    tl.to(camera.position, {
      ...POSES.END.camLocalPos,
      ease: 'none'
    }, 0);
  }

  // Animate target with onUpdate callback
  tl.to(targetProxy, {
    ...POSES.END.target,
    ease: 'none',
    onUpdate: () => {
      if (applyTarget) {
        applyTarget(targetProxy);
      }
    }
  }, 0);

  console.log('✅ ScrollTrigger timeline created (pose-based with zoom)');
  return tl;
}

/**
 * Refresh ScrollTrigger (call after layout changes)
 */
export function refreshScrollTrigger() {
  ScrollTrigger.refresh();
  console.log('♻️  ScrollTrigger refreshed');
}

/**
 * Create debounced refresh function
 * @param {number} delay - Debounce delay in ms
 */
export function createDebouncedRefresh(delay = 300) {
  let timeout;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(refreshScrollTrigger, delay);
  };
}
