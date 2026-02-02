import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

/**
 * Apply HDRI environment lighting to scene
 * @param {THREE.WebGLRenderer} renderer - Renderer instance
 * @param {THREE.Scene} scene - Three.js scene
 * @param {Object} opts - Options { intensity, rotationY }
 */
export async function applyHDRI(renderer, scene, opts = {}) {
  const { intensity = 1.3, rotationY = 0 } = opts;

  try {
    const loader = new RGBELoader();
    const hdriTexture = await new Promise((resolve, reject) => {
      loader.load(
        '/assets/hdri/studio_small_08_1k.hdr',
        resolve,
        undefined,
        reject
      );
    });

    // Generate environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envMap = pmremGenerator.fromEquirectangular(hdriTexture);
    pmremGenerator.dispose();
    hdriTexture.dispose();

    // Apply rotation if specified
    if (rotationY !== 0) {
      envMap.texture.rotation = rotationY;
    }

    // Set environment on scene (background stays null to preserve gradient)
    scene.environment = envMap.texture;
    renderer.toneMappingExposure = intensity;

    console.log(`✅ HDRI loaded | intensity: ${intensity}`);
    return envMap;
  } catch (error) {
    console.warn('⚠️ HDRI not found, using RoomEnvironment fallback');
    // Fallback to RoomEnvironment for decent lighting without HDRI
    try {
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envMap = pmremGenerator.fromScene(roomEnv);
      scene.environment = envMap.texture;
      renderer.toneMappingExposure = intensity;
      console.log('✅ RoomEnvironment fallback applied');
      return envMap;
    } catch (fallbackError) {
      console.warn('⚠️ RoomEnvironment also failed, studio lights only');
      return null;
    }
  }
}

/**
 * Apply 3-point studio lighting rig
 * @param {THREE.Scene} scene - Three.js scene
 * @param {Object} opts - Configuration options
 */
export function applyStudioLights(scene, opts = {}) {
  const {
    keyIntensity = 2.8,
    fillIntensity = 0.9,
    rimIntensity = 1.6,
    ambientIntensity = 0.2,
    shadowMapSize = 2048,
    shadowBias = -0.0005,
  } = opts;

  // Key light (main directional light) - enhanced for vehicle rendering
  const keyLight = new THREE.DirectionalLight(0xffffff, keyIntensity);
  keyLight.position.set(6, 8, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = shadowMapSize;
  keyLight.shadow.mapSize.height = shadowMapSize;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 50;
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  keyLight.shadow.bias = shadowBias;
  scene.add(keyLight);

  // Fill light (secondary, opposite side) - neutral white for vehicles
  const fillLight = new THREE.DirectionalLight(0xffffff, fillIntensity);
  fillLight.position.set(-6, 4, 2);
  scene.add(fillLight);

  // Rim light (backlight for edge definition)
  const rimLight = new THREE.DirectionalLight(0xffffff, rimIntensity);
  rimLight.position.set(-6, 8, -6);
  scene.add(rimLight);

  // Ambient hemisphere light for soft fill
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222233, ambientIntensity);
  scene.add(hemiLight);

  console.log(`✅ Studio lights applied | key: ${keyIntensity}, fill: ${fillIntensity}, rim: ${rimIntensity}`);

  return { keyLight, fillLight, rimLight, hemiLight };
}

/**
 * Add shadow catcher plane below model
 * @param {THREE.Scene} scene - Scene to add plane to
 * @param {number} yPosition - Y position (typically bbox.min.y - 0.02)
 * @param {number} size - Plane size
 */
export function addShadowCatcher(scene, yPosition = -2, size = 20) {
  const planeGeometry = new THREE.PlaneGeometry(size, size);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = yPosition;
  plane.receiveShadow = true;
  scene.add(plane);
  console.log(`✅ Shadow catcher added at y=${yPosition}`);
  return plane;
}

/**
 * Configure renderer for professional rendering
 * @param {THREE.WebGLRenderer} renderer - Renderer instance
 */
export function configureRenderer(renderer) {
  // Color space
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Tone mapping (enhanced exposure for vehicles)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Physically-based lighting
  if (renderer.physicallyCorrectLights !== undefined) {
    renderer.physicallyCorrectLights = true;
  }

  // Shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  console.log('✅ Renderer configured | ACESFilmic tone mapping, soft shadows');
}
