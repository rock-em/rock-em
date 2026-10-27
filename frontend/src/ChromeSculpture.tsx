import { useEffect, useRef } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import "./ChromeSculpture.css";

type Props = { topic: string };

export default function ChromeSculpture({ topic }: Props) {
  const shapeSeed = Array.from(topic).reduce(
  (sum, char) => sum + char.charCodeAt(0),
  0
);
  const mountRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0, active: false, dragging: false });

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      host.textContent = "3D preview unavailable (WebGL required)";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.55;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 8.2);

    // Procedural studio reflections; no HDR image or Blender asset required.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.035);
    scene.environment = environment.texture;

    // Evenly spaced vertices avoid the pinched poles of a latitude/longitude
    // sphere. Weld shared edges so recalculated chrome normals have no seams.
    const source = new THREE.IcosahedronGeometry(1.55, 31);
    source.deleteAttribute("uv");
    source.deleteAttribute("normal");
    const geometry = mergeVertices(source);
    source.dispose();
    const base = new Float32Array(geometry.attributes.position.array);
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 1,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.10,
      envMapIntensity: 2.4,
    });
    const mesh = new THREE.Mesh(geometry, material);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2.65);
    scene.add(mesh);

    let elapsed = 0;
    let previousTime = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let disposed = false;
    let mx = 0;
    let my = 0;
    let energy = 0;

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    function animate() {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      if (!reduceMotion) elapsed += dt;
      const t = elapsed;
      const pointerEase = 1 - Math.exp(-10 * dt);
      const energyEase = 1 - Math.exp(-5.5 * dt);
      
      const targetX = pointer.current.active ? pointer.current.x : 0;
      const targetY = pointer.current.active ? pointer.current.y : 0;
      mx += (targetX - mx) * pointerEase;
      my += (targetY - my) * pointerEase;
      energy += (
        (pointer.current.dragging ? 1.8 : pointer.current.active ? 1.0 : 0)
        - energy
      ) * energyEase;
      
      let maxRadiusSquared = 0;
      for (let i = 0; i < positions.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        const z = base[i * 3 + 2];

        const nx = x / 1.55;
        const ny = y / 1.55;
        const nz = z / 1.55;

        // Continuous flowing deformation
        const seed = shapeSeed * 0.1;

        const flow =
          0.30 * Math.sin(3.2 * nx + 2.8 * ny + t * 0.8 + seed) *
            Math.cos(2.6 * nz - t * 0.5) +
          0.22 * Math.sin(4.5 * ny - 3.0 * nz - t * 0.65 + seed * 0.7) +
          0.18 * Math.cos(5.0 * nx + 3.0 * nz + t * 0.55 + seed * 1.3) +
          0.06 * Math.sin(7.0 * (nx + ny) - t * 0.9 + seed * 0.4);

        // Distance from cursor's projected position
        const dx = nx - mx * 0.85;
        const dy = ny + my * 0.85;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Localized mouse interaction
        const influence = Math.exp(-distance * distance * 5.0);

        // Surface ripples spread outward from cursor
        const ripple =
          Math.sin(distance * 11.0 - t * 6.0) *
          influence *
          energy *
          0.10;

        // Push surface outward or inward near cursor
        const deformation =
          influence *
          energy *
          (0.32 + 0.12 * Math.sin(t * 6.0));

        // Combine fluid movement with cursor interaction
        const radius = Math.max(
          0.35,
          1 + flow + ripple + deformation
        );

        // Stretch the liquid toward the moving cursor
        const stretchX = influence * energy * mx * 0.24;
        const stretchY = influence * energy * -my * 0.24;

        positions.setXYZ(
          i,
          x * radius +
            stretchX +
            0.15 * Math.sin(2.8 * ny + t * 0.5),

          y * radius +
            stretchY +
            0.14 * Math.cos(3.0 * nz - t * 0.4),

          z * radius +
            0.16 * Math.sin(3.2 * nx + t * 0.45)
        );
        maxRadiusSquared = Math.max(maxRadiusSquared,
          positions.getX(i) ** 2 + positions.getY(i) ** 2 + positions.getZ(i) ** 2);
      }

      // Fit a sphere around every deformed vertex, leaving room on all sides
      // even while dragging or on a narrow screen. Expand immediately to avoid
      // clipping, and ease back slowly without a distracting camera snap.
      const halfVertical = THREE.MathUtils.degToRad(camera.fov / 2);
      const halfHorizontal = Math.atan(Math.tan(halfVertical) * camera.aspect);
      const radius = Math.max(2.65, Math.sqrt(maxRadiusSquared));
      const distance = radius * 1.12 / Math.sin(Math.min(halfVertical, halfHorizontal));
      camera.position.z = Math.max(distance, camera.position.z + (distance - camera.position.z) * (1 - Math.exp(-2 * dt)));
      geometry.boundingSphere!.radius = radius;
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      mesh.rotation.y = t * 0.13 + mx * 0.38;
      mesh.rotation.x = 0.22 + my * 0.32 + Math.sin(t * 0.22) * 0.12;
      mesh.rotation.z = Math.sin(t * 0.17) * 0.10;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      environment.dispose();
      pmrem.dispose();
      room.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [shapeSeed]);

  return (
    <div className="chrome-wrap">
      <div
        ref={mountRef}
        className="chrome-stage"
        role="img"
        aria-label={`Interactive floating chrome sculpture for ${topic}`}
        onPointerEnter={() => { pointer.current.active = true; }}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          pointer.current.x = THREE.MathUtils.clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1);
          pointer.current.y = THREE.MathUtils.clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1, -1, 1);
        }}
        onPointerDown={(event) => {
          pointer.current.dragging = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={() => { pointer.current.dragging = false; }}
        onLostPointerCapture={() => { pointer.current.dragging = false; }}
        onPointerCancel={() => { pointer.current.dragging = false; }}
        onPointerLeave={() => { pointer.current.active = false; pointer.current.dragging = false; }}
      />
      <div className="chrome-topic" aria-live="polite">{topic}</div>
    </div>
  );
}
