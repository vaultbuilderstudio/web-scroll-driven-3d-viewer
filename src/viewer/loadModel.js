import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Load GLB model with enhanced features
 * @param {string} modelPath - Path to GLB file
 * @param {THREE.Scene} scene - Three.js scene
 * @param {THREE.WebGLRenderer} renderer - Three.js renderer (for KTX2 support)
 * @returns {Promise<{model: THREE.Group, sphere: THREE.Sphere}>} - Loaded model + bounding sphere
 */
export function loadModel(modelPath, scene, renderer) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    // Try to use DRACO decompression if available
    try {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(dracoLoader);
    } catch (e) {
      // DRACO not critical, continue without it
    }

    // Enable Meshopt decoder if the model uses it
    try {
      loader.setMeshoptDecoder(MeshoptDecoder);
    } catch (e) {
      // Meshopt not critical, continue without it
    }

    // Enable KTX2 texture support if the model uses it
    try {
      const ktx2Loader = new KTX2Loader();
      ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/basis/');
      if (renderer) {
        ktx2Loader.detectSupport(renderer);
      }
      loader.setKTX2Loader(ktx2Loader);
    } catch (e) {
      // KTX2 not critical, continue without it
    }

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;

        // Compute bounding box
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Center model
        model.position.sub(center);

        // Smart scaling: only scale if wildly off (>1000 or <0.01)
        const radius = maxDim / 2;
        if (radius > 1000 || radius < 0.01) {
          const scale = 3 / maxDim;
          model.scale.setScalar(scale);
          console.log(`📏 Scaled model by ${scale.toFixed(3)}x`);
        } else {
          console.log(`📏 Model size OK (radius: ${radius.toFixed(2)})`);
        }

        // Setup shadows and detect glass materials
        model.traverse((node) => {
          if (node.isMesh) {
            const materials = getMaterials(node);
            const isGlass = detectGlass(node, materials);
            
            if (isGlass) {
              // Apply glass material for transparency
              const baseColor = materials[0]?.color ? materials[0].color.clone() : new THREE.Color(0xffffff);
              const glassMaterial = new THREE.MeshPhysicalMaterial({
                color: baseColor,
                roughness: 0.04,
                metalness: 0.0,
                transmission: 1.0,
                thickness: 0.06,
                ior: 1.45,
                transparent: true,
                opacity: 1.0,
                envMapIntensity: 1.7,
                specularIntensity: 1.0,
                clearcoat: 0.2,
                depthWrite: false
              });
              node.material = glassMaterial;
              node.castShadow = false;
              node.receiveShadow = false;
              node.renderOrder = 10; // Reduce sorting artifacts
              console.log(`🪟 Glass material applied: ${node.name}`);
            } else {
              // Regular meshes cast/receive shadows
              node.castShadow = true;
              node.receiveShadow = true;
            }
          }
        });

        // Recompute bounding sphere after positioning/scaling
        const finalBox = new THREE.Box3().setFromObject(model);
        const sphere = finalBox.getBoundingSphere(new THREE.Sphere());

        scene.add(model);
        console.log(`✅ Model loaded | sphere radius: ${sphere.radius.toFixed(2)}, center: (${sphere.center.x.toFixed(1)}, ${sphere.center.y.toFixed(1)}, ${sphere.center.z.toFixed(1)})`);
        resolve({ model, sphere });
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`Loading model: ${percent.toFixed(0)}%`);
      },
      (error) => {
        console.error('❌ Error loading model:', error);
        reject(error);
      }
    );
  });
}

/**
 * Detect if a mesh should use glass material
 * Checks mesh name and material name for glass-related keywords
 */
function detectGlass(mesh, materials = []) {
  const glassKeywords = [
    'glass',
    'window',
    'windshield',
    'windscreen',
    'rear_window',
    'front_window',
    'backglass',
    '透明'
  ];
  const name = (mesh.name || '').toLowerCase();

  const nameMatch = glassKeywords.some((keyword) => name.includes(keyword));
  const materialMatch = materials.some((mat) => {
    const matName = (mat?.name || '').toLowerCase();
    const isTransparent = mat?.transparent === true;
    const lowOpacity = typeof mat?.opacity === 'number' && mat.opacity < 1;
    return glassKeywords.some((keyword) => matName.includes(keyword)) || isTransparent || lowOpacity;
  });

  return nameMatch || materialMatch;
}

function getMaterials(mesh) {
  if (Array.isArray(mesh.material)) {
    return mesh.material.filter(Boolean);
  }
  return mesh.material ? [mesh.material] : [];
}
