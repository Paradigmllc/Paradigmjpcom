export function buildThreeLayerScript(): string {
  return String.raw`<script type="module">
    import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

    const canvas = document.getElementById("three-layer");
    if (!canvas) {
      console.warn("[video-three] canvas #three-layer not found; skipping background layer");
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 1920;
    const height = rect.height || 1080;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);

    const group = new THREE.Group();
    scene.add(group);

    const material = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.32 });
    for (let i = 0; i < 26; i += 1) {
      const points = [];
      const radius = 1.2 + i * 0.13;
      for (let j = 0; j < 80; j += 1) {
        const angle = (j / 79) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.58, (i % 5) * -0.06));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.LineLoop(geometry, material);
      group.add(line);
    }

    function renderAt(time) {
      group.rotation.z = time * 0.05;
      group.rotation.x = Math.sin(time * 0.18) * 0.12;
      group.position.x = Math.sin(time * 0.12) * 0.4;
      renderer.render(scene, camera);
    }

    window.addEventListener("hf-seek", function(event) { renderAt(event.detail.time || 0); });
    renderAt(0);

    window.addEventListener("resize", function() {
      const r = canvas.getBoundingClientRect();
      renderer.setSize(r.width || 1920, r.height || 1080, false);
      camera.aspect = (r.width || 1920) / (r.height || 1080);
      camera.updateProjectionMatrix();
    });
  </script>`;
}
