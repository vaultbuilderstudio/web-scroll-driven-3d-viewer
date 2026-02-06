import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Initialize Three.js scene, camera, renderer with enhanced features
 * @returns {Object} scene, camera, cameraRig, renderer, canvas, controls
 */
export function initViewer(canvasElement) {
  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // Camera Rig (wrap camera so GSAP can rotate the rig, not the camera)
  const cameraRig = new THREE.Object3D();
  scene.add(cameraRig);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    30, // FOV
    canvasElement.clientWidth / canvasElement.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 8); // Position relative to rig
  cameraRig.add(camera);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: true,
    alpha: false,
  });
  renderer.setClearColor(0xffffff, 1);
  renderer.setSize(canvasElement.clientWidth, canvasElement.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // OrbitControls for manual inspection (DISABLED by default, enable with O key)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.autoRotate = false; // DISABLED - scroll-only animation
  controls.enabled = false; // Start disabled
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.enablePan = true;

  // Create status overlay
  const statusDiv = createStatusOverlay();

  // Setup keyboard controls (includes pose capture)
  setupKeyboardControls(scene, renderer, controls, camera, cameraRig);

  return { scene, camera, cameraRig, renderer, canvas: canvasElement, controls, statusDiv };
}

/**
 * Create status overlay UI
 */
function createStatusOverlay() {
  const div = document.createElement('div');
  div.id = 'status-overlay';
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    border-radius: 4px;
    z-index: 1000;
    line-height: 1.6;
    max-width: 200px;
  `;
  div.innerHTML = `
    <div>Loading model...</div>
    <div style="font-size: 10px; margin-top: 8px; color: #888;">O: OrbitControls | 1/2: Apply Pose | P: Print | L/B/G: Toggles</div>
  `;
  document.body.appendChild(div);
  return div;
}

/**
 * Update status message
 */
export function updateStatus(statusDiv, message) {
  if (statusDiv) {
    const lines = statusDiv.innerHTML.split('<div style="font-size: 10px;')[0];
    statusDiv.innerHTML = `<div>${message}</div><div style="font-size: 10px; margin-top: 8px; color: #888;">O: OrbitControls | 1/2: Apply Pose | P: Print | L/B/G: Toggles</div>`;
  }
}

/**
 * Auto-frame camera to fit bounding sphere
 */
export function autoFrame(camera, sphere, controls) {
  if (!sphere) {
    console.warn('No bounding sphere provided');
    return;
  }

  // Calculate distance to fit sphere in view
  const vFOV = camera.fov * Math.PI / 180; // vertical field-of-view in radians
  const distance = sphere.radius / Math.tan(vFOV / 2) * 1.5; // 1.5x padding

  // Position camera looking at sphere center
  const direction = new THREE.Vector3(0, 1, 1).normalize();
  const cameraPos = sphere.center.clone().addScaledVector(direction, distance);
  camera.position.copy(cameraPos);

  // Update controls
  controls.target.copy(sphere.center);
  controls.update();

  console.log(`📷 Camera framed | distance: ${distance.toFixed(2)}, target: (${sphere.center.x.toFixed(1)}, ${sphere.center.y.toFixed(1)}, ${sphere.center.z.toFixed(1)})`);
}

/**
 * Setup keyboard controls (including pose capture workflow)
 */
function setupKeyboardControls(scene, renderer, controls, camera, cameraRig) {
  let lightsVisible = true;
  let groundVisible = false;
  let bgColor = 0xffffff;

  let groundPlane = null;

  window.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
      case 'o':
        // Toggle OrbitControls
        controls.enabled = !controls.enabled;
        console.log(`🎮 OrbitControls ${controls.enabled ? 'ENABLED' : 'DISABLED'}`);
        break;

      case 'p':
        // Print current pose as JSON for copy/paste into POSES
        const pose = capturePose(cameraRig, camera, controls);
        console.log('📸 POSE CAPTURED (copy this into scrollTimeline.js POSES):');
        console.log(JSON.stringify(pose, null, 2));
        break;

      case '1':
        if (window.__applyPoseStart) {
          window.__applyPoseStart();
          console.log('🎯 Applied START pose');
        }
        break;

      case '2':
        if (window.__applyPoseEnd) {
          window.__applyPoseEnd();
          console.log('🎯 Applied END pose');
        }
        break;

      case 'l':
        // Toggle studio lights
        lightsVisible = !lightsVisible;
        scene.children.forEach((child) => {
          if (
            child instanceof THREE.Light &&
            child !== renderer.domElement // Skip any non-Light children
          ) {
            child.visible = lightsVisible;
          }
        });
        console.log(`💡 Lights ${lightsVisible ? 'ON' : 'OFF'}`);
        break;

      case 'b':
        // Toggle background
        if (scene.background?.getHex?.() === bgColor) {
          scene.background = new THREE.Color(0x000000);
          console.log('🎨 Background: Black');
        } else {
          scene.background = new THREE.Color(bgColor);
          console.log('🎨 Background: White');
        }
        break;

      case 'g':
        // Toggle ground plane
        if (groundVisible && groundPlane) {
          scene.remove(groundPlane);
          groundPlane = null;
        } else {
          groundPlane = createGroundPlane();
          scene.add(groundPlane);
        }
        groundVisible = !groundVisible;
        console.log(`🟫 Ground plane ${groundVisible ? 'ON' : 'OFF'}`);
        break;

      default:
        break;
    }
  });
}

/**
 * Create ground plane with shadow material
 */
function createGroundPlane() {
  const planeGeometry = new THREE.PlaneGeometry(20, 20);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.4 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -2;
  plane.receiveShadow = true;
  return plane;
}

/**
 * Handle window resize
 */
export function setupResize(camera, renderer, canvas) {
  const handleResize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  window.addEventListener('resize', handleResize);
  return handleResize;
}

/**
 * Start render loop with controls update
 */
export function startRenderLoop(renderer, scene, camera, controls) {
  function animate() {
    requestAnimationFrame(animate);
    if (controls && controls.enabled) {
      controls.update();
    }
    renderer.render(scene, camera);
  }
  animate();
}

/**
 * Capture current camera pose for copy/paste into POSES
 * Includes camera local position (zoom/dolly) which is critical for exact view reproduction
 */
function capturePose(cameraRig, camera, controls) {
  const rigQuat = new THREE.Quaternion();
  cameraRig.getWorldQuaternion(rigQuat);
  
  const camWorldPos = new THREE.Vector3();
  camera.getWorldPosition(camWorldPos);
  
  const camWorldQuat = new THREE.Quaternion();
  camera.getWorldQuaternion(camWorldQuat);

  return {
    rigPos: {
      x: parseFloat(cameraRig.position.x.toFixed(6)),
      y: parseFloat(cameraRig.position.y.toFixed(6)),
      z: parseFloat(cameraRig.position.z.toFixed(6))
    },
    rigRot: {
      x: parseFloat(cameraRig.rotation.x.toFixed(6)),
      y: parseFloat(cameraRig.rotation.y.toFixed(6)),
      z: parseFloat(cameraRig.rotation.z.toFixed(6))
    },
    rigQuat: {
      x: parseFloat(rigQuat.x.toFixed(6)),
      y: parseFloat(rigQuat.y.toFixed(6)),
      z: parseFloat(rigQuat.z.toFixed(6)),
      w: parseFloat(rigQuat.w.toFixed(6))
    },
    camLocalPos: {
      x: parseFloat(camera.position.x.toFixed(6)),
      y: parseFloat(camera.position.y.toFixed(6)),
      z: parseFloat(camera.position.z.toFixed(6))
    },
    camWorldPos: {
      x: parseFloat(camWorldPos.x.toFixed(6)),
      y: parseFloat(camWorldPos.y.toFixed(6)),
      z: parseFloat(camWorldPos.z.toFixed(6))
    },
    camWorldQuat: {
      x: parseFloat(camWorldQuat.x.toFixed(6)),
      y: parseFloat(camWorldQuat.y.toFixed(6)),
      z: parseFloat(camWorldQuat.z.toFixed(6)),
      w: parseFloat(camWorldQuat.w.toFixed(6))
    },
    target: {
      x: parseFloat(controls.target.x.toFixed(6)),
      y: parseFloat(controls.target.y.toFixed(6)),
      z: parseFloat(controls.target.z.toFixed(6))
    },
    fov: parseFloat(camera.fov.toFixed(2))
  };
}
