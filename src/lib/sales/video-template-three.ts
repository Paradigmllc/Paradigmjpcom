export function buildThreeLayerScript(): string {
  return `<script type="module">
    import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.2/+esm";
    const canvas = document.getElementById("three-layer");
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(1920, 1080, false); renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1920 / 1080, 0.1, 100);
    camera.position.set(0, 0, 7.2);
    const group = new THREE.Group(); scene.add(group);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: .16 });
    const accent = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: .22 });
    for (let i = 0; i < 7; i += 1) {
      const geo = i % 2 === 0 ? new THREE.IcosahedronGeometry(.5 + i * .06, 1) : new THREE.TorusGeometry(.42 + i * .04, .012, 8, 42);
      const mesh = new THREE.Mesh(geo, i % 3 === 0 ? accent : material);
      mesh.position.set((i - 3) * .86, Math.sin(i) * 1.1, -i * .18); group.add(mesh);
    }
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: .18 });
    for (let i = 0; i < 8; i += 1) {
      const points = [new THREE.Vector3(-4 + i, -2.2, -1), new THREE.Vector3(-2.8 + i * .5, .4, -1.4), new THREE.Vector3(3.5 - i * .15, 2.1, -1.1)];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
    }
    function renderAt(time) {
      group.rotation.y = time * .045; group.rotation.x = Math.sin(time * .18) * .08;
      group.children.forEach(function(child, index) {
        child.rotation.x = time * (.08 + index * .012); child.rotation.y = time * (.12 + index * .009);
      });
      camera.position.x = Math.sin(time * .11) * .28; camera.position.y = Math.cos(time * .09) * .18;
      renderer.render(scene, camera);
    }
    window.addEventListener("hf-seek", function(event) { renderAt(event.detail.time || 0); });
    renderAt(window.__hfThreeTime || 0);
  </script>`
}
