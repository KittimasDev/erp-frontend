"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface SMTBiomassMap3DProps {
  onOpenInterior?: () => void;
}

interface ZoneInfo {
  badge: string;
  title: string;
  desc: string;
  coords: string;
  anchor: THREE.Vector3;
  camPos: THREE.Vector3;
  camTarget: THREE.Vector3;
}

export const SMTBiomassMap3D: React.FC<SMTBiomassMap3DProps> = ({ onOpenInterior }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // UI States
  const [activeCameraMode, setActiveCameraMode] = useState<"satellite" | "isometric">("satellite");
  const [isFollowingRoute, setIsFollowingRoute] = useState(false);
  const [isHudHidden, setIsHudHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeZoneKey, setActiveZoneKey] = useState<string>("smt");
  const [isInfoCardOpen, setIsInfoCardOpen] = useState(true);

  // Layer Visibility
  const [layers, setLayers] = useState({
    route: true,
    roads: true,
    labels: true,
    relief: true,
  });

  // Marker Elements Refs
  const markerSmtRef = useRef<HTMLDivElement>(null);
  const markerAmphaRef = useRef<HTMLDivElement>(null);
  const markerTmpRef = useRef<HTMLDivElement>(null);
  const markerSeRef = useRef<HTMLDivElement>(null);
  const markerWatermarkRef = useRef<HTMLDivElement>(null);

  // Animation & Control References
  const stateRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    controls: OrbitControls | null;
    animFrameId: number;
    camAnim: ((now: number) => void) | null;
    routeGroup: THREE.Group | null;
    roadNetworkGroup: THREE.Group | null;
    structures3DGroup: THREE.Group | null;
    interactableMeshes: THREE.Mesh[];
    routeCurve: THREE.CatmullRomCurve3 | null;
    gpsTrackerGroup: THREE.Group | null;
    trackerDot: THREE.Mesh | null;
    routeProgress: number;
    isFollowingRoute: boolean;
    zones: Record<string, ZoneInfo>;
    clock: THREE.Clock;
    layers: {
      route: boolean;
      roads: boolean;
      labels: boolean;
      relief: boolean;
    };
  }>({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    animFrameId: 0,
    camAnim: null,
    routeGroup: null,
    roadNetworkGroup: null,
    structures3DGroup: null,
    interactableMeshes: [],
    routeCurve: null,
    gpsTrackerGroup: null,
    trackerDot: null,
    routeProgress: 0,
    isFollowingRoute: false,
    zones: {},
    clock: new THREE.Clock(),
    layers: {
      route: true,
      roads: true,
      labels: true,
      relief: true,
    },
  });

  // Keep stateRef in sync with layers & following state
  useEffect(() => {
    stateRef.current.layers = layers;
  }, [layers]);

  useEffect(() => {
    stateRef.current.isFollowingRoute = isFollowingRoute;
  }, [isFollowingRoute]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Main Three.js Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ========================================================================
    // 1. EXACT NORMALIZED IMAGE SPACE (u, v) -> 3D WORLD SPACE MAPPING
    // ========================================================================
    const MAP_W = 1040;
    const MAP_H = 940;
    const uToX = (u: number) => (u - 0.5) * MAP_W;
    const vToZ = (v: number) => (v - 0.5) * MAP_H;
    const TILT_ANGLE = 0.422; // ~24.2 degrees counter-clockwise

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x161b17);
    scene.fog = new THREE.FogExp2(0x161b17, 0.00032);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(28, width / height, 5, 4500);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 80;
    controls.maxDistance = 2400;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xe2e8f0, 0.78);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x292524, 0.38);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.15);
    sunLight.position.set(220, 480, 240);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 50;
    sunLight.shadow.camera.far = 1400;
    const d = 540;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // ========================================================================
    // 2. HIGH-RESOLUTION PIXEL-ACCURATE SATELLITE CANVAS TEXTURE (2048x2048)
    // ========================================================================
    function createExactSatelliteTexture() {
      const W = 2048;
      const H = 2048;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return new THREE.Texture();

      const px = (u: number) => u * W;
      const py = (v: number) => v * H;

      // Base dark earthy brown-olive satellite terrain
      ctx.fillStyle = "#362a23";
      ctx.fillRect(0, 0, W, H);

      // Helper to draw polygon in normalized (u, v) coordinates with optional plow stripes
      function fillUVPoly(
        uvPts: number[][],
        fillStyle: string,
        borderColor: string | null = null,
        borderWidth = 3,
        stripeAngle: number | null = null,
        stripeColor: string | null = null,
        stripeGap = 11,
      ) {
        if (!ctx) return;
        ctx.save();
        ctx.beginPath();
        uvPts.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(px(p[0]), py(p[1]));
          else ctx.lineTo(px(p[0]), py(p[1]));
        });
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();

        if (stripeAngle !== null && stripeColor) {
          ctx.clip();
          ctx.translate(W / 2, H / 2);
          ctx.rotate(stripeAngle);
          ctx.strokeStyle = stripeColor;
          ctx.lineWidth = 3.2;
          for (let s = -W; s < W; s += stripeGap) {
            ctx.beginPath();
            ctx.moveTo(s, -H);
            ctx.lineTo(s, H);
            ctx.stroke();
          }
        }
        ctx.restore();

        if (borderColor) {
          ctx.beginPath();
          uvPts.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(px(p[0]), py(p[1]));
            else ctx.lineTo(px(p[0]), py(p[1]));
          });
          ctx.closePath();
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = borderWidth;
          ctx.stroke();
        }
      }

      // A. TOP-LEFT AGRICULTURAL RICE PADDIES
      fillUVPoly([[0, 0], [0.22, 0], [0.16, 0.22], [0, 0.29]], "#1d3729", "#14261c", 5, -0.42, "rgba(255,255,255,0.03)", 14);
      fillUVPoly([[0.18, 0], [0.34, 0], [0.37, 0.12], [0.15, 0.22]], "#8c6e4d", "#3a2d20", 6, -0.42, "rgba(45,30,15,0.28)", 10);
      fillUVPoly([[0, 0.28], [0.37, 0.12], [0.39, 0.18], [0, 0.35]], "#957554", "#3b2e21", 5, -0.42, "rgba(50,32,16,0.32)", 9);
      fillUVPoly([[0, 0.35], [0.20, 0.26], [0.26, 0.42], [0, 0.55]], "#21382b", "#17281e", 5, 1.15, "rgba(0,0,0,0.15)", 12);
      fillUVPoly([[0, 0.55], [0.21, 0.45], [0.25, 0.55], [0, 0.68]], "#193524", "#12261a", 6, -0.42, "rgba(255,255,255,0.04)", 10);
      fillUVPoly([[0, 0.68], [0.16, 0.61], [0.21, 0.75], [0, 0.85]], "#3c3c2a", "#25261b", 5, -0.42, "rgba(0,0,0,0.18)", 12);

      // B. BOTTOM-LEFT & BOTTOM AGRICULTURAL FIELDS
      fillUVPoly([[0, 0.88], [0.18, 0.80], [0.25, 1.0], [0, 1.0]], "#564332", "#2b2118", 6, -0.42, "rgba(255,220,180,0.06)", 12);
      fillUVPoly([[0.18, 0.80], [0.30, 0.75], [0.41, 1.0], [0.25, 1.0]], "#3c2e24", "#241b15", 5);

      // C. EAST & BOTTOM-RIGHT STEPPED AGRICULTURAL PADDIES
      fillUVPoly([[0.68, 0], [1.0, 0], [1.0, 0.22], [0.85, 0.25], [0.76, 0.05]], "#4a362b", "#261c16", 5, -0.40, "rgba(25,15,10,0.25)", 11);
      fillUVPoly([[0.75, 0.15], [1.0, 0.06], [1.0, 0.55], [0.91, 0.58], [0.76, 0.20]], "#423026", "#241a14", 6, -0.42, "rgba(255,210,170,0.05)", 10);
      fillUVPoly([[0.82, 0.50], [1.0, 0.42], [1.0, 0.85], [0.72, 1.0], [0.68, 0.88], [0.88, 0.75]], "#282423", "#1a1716", 6, -0.42, "rgba(255,255,255,0.03)", 12);

      // D. CENTRAL INDUSTRIAL COMPOUND SOIL & PADS
      fillUVPoly(
        [
          [0.09, 0.34],
          [0.54, 0.04],
          [0.79, 0.38],
          [0.72, 0.43],
          [0.86, 0.78],
          [0.39, 0.98],
          [0.17, 0.68],
          [0.25, 0.58],
        ],
        "#44352a",
        "#261e18",
        8,
      );

      const soilPatches = [
        { u: 0.42, v: 0.80, r: 0.16, c: "rgba(88, 56, 40, 0.55)" },
        { u: 0.30, v: 0.84, r: 0.12, c: "rgba(78, 50, 36, 0.50)" },
        { u: 0.25, v: 0.48, r: 0.10, c: "rgba(95, 76, 58, 0.42)" },
        { u: 0.38, v: 0.46, r: 0.065, c: "rgba(185, 175, 160, 0.65)" },
        { u: 0.42, v: 0.28, r: 0.08, c: "rgba(135, 138, 140, 0.48)" },
        { u: 0.49, v: 0.16, r: 0.07, c: "rgba(150, 145, 138, 0.45)" },
        { u: 0.535, v: 0.125, r: 0.035, c: "rgba(194, 128, 68, 0.82)" },
        { u: 0.23, v: 0.72, r: 0.06, c: "rgba(168, 158, 142, 0.55)" },
      ];
      soilPatches.forEach((sp) => {
        const rad = sp.r * W;
        const grad = ctx.createRadialGradient(px(sp.u), py(sp.v), rad * 0.1, px(sp.u), py(sp.v), rad);
        grad.addColorStop(0, sp.c);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px(sp.u), py(sp.v), rad, 0, Math.PI * 2);
        ctx.fill();
      });

      // Trees / Shrub clusters
      const rng = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };
      for (let i = 0; i < 260; i++) {
        const tu = 0.15 + rng(i * 13.7) * 0.65;
        const tv = 0.20 + rng(i * 29.3) * 0.75;
        if (
          (tv > 0.66 && tu > 0.24 && tu < 0.58) ||
          (tu < 0.28 && tv > 0.35 && tv < 0.65) ||
          (tu > 0.66 && tv > 0.52 && tv < 0.82)
        ) {
          ctx.fillStyle = i % 2 === 0 ? "rgba(24, 42, 28, 0.65)" : "rgba(38, 54, 32, 0.55)";
          ctx.beginPath();
          ctx.arc(px(tu), py(tv), 6 + rng(i * 7.1) * 14, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // E. WATER RESERVOIRS, CANALS & 6 TREATMENT PONDS
      const waterBodies = [
        [[0.32, 0], [0.52, 0], [0.55, 0.03], [0.43, 0.11], [0.36, 0.14]],
        [[0.55, 0], [0.68, 0], [0.64, 0.05], [0.56, 0.02]],
        [[0.68, 0.04], [0.84, 0.01], [0.85, 0.10], [0.71, 0.16]],
        [[0.73, 0.20], [0.81, 0.17], [0.90, 0.44], [0.79, 0.48]],
        [[0.09, 0.33], [0.41, 0.15], [0.42, 0.18], [0.15, 0.33], [0.18, 0.40], [0.13, 0.42]],
        [[0.525, 0.245], [0.568, 0.228], [0.598, 0.312], [0.552, 0.328]],
        [[0.578, 0.224], [0.612, 0.210], [0.628, 0.255], [0.594, 0.268]],
        [[0.598, 0.275], [0.632, 0.262], [0.648, 0.308], [0.614, 0.320]],
        [[0.622, 0.206], [0.656, 0.192], [0.672, 0.238], [0.638, 0.252]],
        [[0.642, 0.258], [0.676, 0.244], [0.692, 0.290], [0.658, 0.304]],
        [[0.665, 0.200], [0.695, 0.188], [0.722, 0.272], [0.692, 0.285]],
        [[0.375, 0.425], [0.412, 0.408], [0.435, 0.475], [0.398, 0.492]],
        [[0.435, 0.495], [0.475, 0.478], [0.512, 0.595], [0.468, 0.615]],
        [[0.72, 0.79], [0.80, 0.75], [0.83, 0.82], [0.74, 0.86]],
        [[0.44, 0.92], [0.71, 0.81], [0.73, 0.86], [0.46, 0.97]],
      ];
      waterBodies.forEach((poly) => {
        fillUVPoly(poly, "#0d1e29", "#2b5954", 5);
      });

      // Noise grain
      const imgData = ctx.getImageData(0, 0, W, H);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 9;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);

      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    }

    const groundGeo = new THREE.PlaneGeometry(MAP_W, MAP_H, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      map: createExactSatelliteTexture(),
      roughness: 0.92,
      metalness: 0.04,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // ========================================================================
    // 3. PIXEL-ACCURATE 3D BUILDINGS, 4x4 SILOS & BIOMASS PLANT
    // ========================================================================
    const structures3DGroup = new THREE.Group();
    scene.add(structures3DGroup);
    stateRef.current.structures3DGroup = structures3DGroup;

    const interactableMeshes: THREE.Mesh[] = [];
    stateRef.current.interactableMeshes = interactableMeshes;

    function registerZone(mesh: THREE.Mesh, zoneKey: string) {
      mesh.userData.zoneKey = zoneKey;
      interactableMeshes.push(mesh);
    }

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x7c827e, roughness: 0.85, metalness: 0.1 });
    const darkPlantMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.65, metalness: 0.45 });
    const steelBridgeMat = new THREE.MeshStandardMaterial({ color: 0xcbd2d9, roughness: 0.4, metalness: 0.65 });
    const siloWallMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.35, metalness: 0.72 });

    function createSiloRoofTexture() {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext("2d");
      if (!ctx) return new THREE.Texture();

      const grad = ctx.createLinearGradient(30, 30, 225, 225);
      grad.addColorStop(0.0, "#525860");
      grad.addColorStop(0.45, "#9aa1a8");
      grad.addColorStop(0.78, "#e2e6ea");
      grad.addColorStop(1.0, "#ffffff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      ctx.strokeStyle = "rgba(40,45,52,0.22)";
      ctx.lineWidth = 1.5;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        ctx.beginPath();
        ctx.moveTo(128, 128);
        ctx.lineTo(128 + Math.cos(a) * 128, 128 + Math.sin(a) * 128);
        ctx.stroke();
      }
      return new THREE.CanvasTexture(c);
    }
    const siloRoofMat = new THREE.MeshStandardMaterial({
      map: createSiloRoofTexture(),
      roughness: 0.32,
      metalness: 0.55,
    });

    function buildUVWarehouse({
      u,
      v,
      uw,
      uv_d,
      h = 11,
      roofColor = 0xd7dbd2,
      rotY = TILT_ANGLE,
      curved = true,
      zoneKey = "warehouses",
      ribs = 7,
    }: {
      u: number;
      v: number;
      uw: number;
      uv_d: number;
      h?: number;
      roofColor?: number;
      rotY?: number;
      curved?: boolean;
      zoneKey?: string;
      ribs?: number;
    }) {
      const w = uw * MAP_W;
      const d = uv_d * MAP_H;
      const group = new THREE.Group();
      group.position.set(uToX(u), 0, vToZ(v));
      group.rotation.y = rotY;

      const shadowApron = new THREE.Mesh(
        new THREE.PlaneGeometry(w + 4, d + 4),
        new THREE.MeshBasicMaterial({ color: 0x161918, transparent: true, opacity: 0.65 }),
      );
      shadowApron.rotation.x = -Math.PI / 2;
      shadowApron.position.set(-2.2, 0.25, -2.2);
      group.add(shadowApron);

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      body.position.y = h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      registerZone(body, zoneKey);
      group.add(body);

      const rMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.55, metalness: 0.22 });
      if (curved) {
        const roofGeo = new THREE.CylinderGeometry(
          d * 0.52,
          d * 0.52,
          w + 1.5,
          24,
          1,
          false,
          -Math.PI / 3,
          (2 * Math.PI) / 3,
        );
        const roof = new THREE.Mesh(roofGeo, rMat);
        roof.rotation.z = Math.PI / 2;
        roof.scale.set(0.28, 1, 1);
        roof.position.y = h - d * 0.52 * 0.14;
        roof.castShadow = true;
        roof.receiveShadow = true;
        registerZone(roof, zoneKey);
        group.add(roof);
      } else {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.5, 1.2, d + 1.5), rMat);
        roof.position.y = h + 0.6;
        roof.castShadow = true;
        roof.receiveShadow = true;
        registerZone(roof, zoneKey);
        group.add(roof);
      }

      const ribMat = new THREE.MeshStandardMaterial({ color: 0xaab0a8, roughness: 0.7 });
      for (let i = 1; i < ribs; i++) {
        const rx = -w / 2 + (w / ribs) * i;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, d + 1), ribMat);
        rib.position.set(rx, h + (curved ? d * 0.08 : 1.3), 0);
        group.add(rib);
      }

      structures3DGroup.add(group);
      return group;
    }

    // 1. SMT BIOMASS PLANT
    buildUVWarehouse({
      u: 0.484,
      v: 0.142,
      uw: 0.072,
      uv_d: 0.048,
      h: 12,
      roofColor: 0xcfd3cc,
      rotY: TILT_ANGLE,
      curved: false,
      zoneKey: "smt",
      ribs: 6,
    });
    buildUVWarehouse({
      u: 0.492,
      v: 0.175,
      uw: 0.058,
      uv_d: 0.032,
      h: 10,
      roofColor: 0xbec2bc,
      rotY: TILT_ANGLE,
      curved: false,
      zoneKey: "smt",
      ribs: 5,
    });

    const boilerGroup = new THREE.Group();
    boilerGroup.position.set(uToX(0.518), 0, vToZ(0.205));
    boilerGroup.rotation.y = TILT_ANGLE;

    const boilerCore = new THREE.Mesh(new THREE.BoxGeometry(44, 18, 32), darkPlantMat);
    boilerCore.position.set(0, 9, 0);
    boilerCore.castShadow = true;
    registerZone(boilerCore, "smt");
    boilerGroup.add(boilerCore);

    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.6, 38, 20), steelBridgeMat);
    chimney.position.set(12, 19, -4);
    chimney.castShadow = true;
    registerZone(chimney, "smt");
    boilerGroup.add(chimney);

    const orangePile = new THREE.Mesh(
      new THREE.ConeGeometry(14, 6.5, 12),
      new THREE.MeshStandardMaterial({ color: 0xc8844b, roughness: 0.95 }),
    );
    orangePile.position.set(uToX(0.534), 3.2, vToZ(0.125));
    orangePile.scale.set(0.9, 1, 1.8);
    orangePile.rotation.y = TILT_ANGLE;
    structures3DGroup.add(orangePile);
    structures3DGroup.add(boilerGroup);

    // 2. 4x4 MAIN SILO GRID + 5 SMALLER SILOS
    const siloGridGroup = new THREE.Group();
    siloGridGroup.position.set(uToX(0.418), 0, vToZ(0.282));
    siloGridGroup.rotation.y = TILT_ANGLE;
    structures3DGroup.add(siloGridGroup);

    const siloR = 9.2;
    const siloH = 17.5;
    const coneH = 4.8;
    const spacingX = 21.2;
    const spacingZ = 20.5;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const sx = (c - 1.5) * spacingX;
        const sz = (r - 1.5) * spacingZ;

        const sUnit = new THREE.Group();
        sUnit.position.set(sx, 0, sz);

        const shadowDisc = new THREE.Mesh(
          new THREE.CircleGeometry(siloR + 1.8, 24),
          new THREE.MeshBasicMaterial({ color: 0x15181a, transparent: true, opacity: 0.78 }),
        );
        shadowDisc.rotation.x = -Math.PI / 2;
        shadowDisc.position.set(-3.2, 0.3, -2.8);
        sUnit.add(shadowDisc);

        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(siloR, siloR, siloH, 28), siloWallMat);
        cyl.position.y = siloH / 2;
        cyl.castShadow = true;
        cyl.receiveShadow = true;
        registerZone(cyl, "silos");
        sUnit.add(cyl);

        const cone = new THREE.Mesh(new THREE.ConeGeometry(siloR + 0.3, coneH, 28), siloRoofMat);
        cone.position.y = siloH + coneH / 2;
        cone.castShadow = true;
        registerZone(cone, "silos");
        sUnit.add(cone);

        siloGridGroup.add(sUnit);
      }
    }

    for (let r = 0; r < 4; r++) {
      const sz = (r - 1.5) * spacingZ;
      const catwalk = new THREE.Mesh(new THREE.BoxGeometry(spacingX * 3.3, 1.4, 2.2), steelBridgeMat);
      catwalk.position.set(0, siloH + coneH + 0.8, sz);
      siloGridGroup.add(catwalk);
    }
    const mainSpineBridge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, spacingZ * 3.6), steelBridgeMat);
    mainSpineBridge.position.set(0, siloH + coneH + 1.6, 0);
    siloGridGroup.add(mainSpineBridge);

    for (let i = 0; i < 5; i++) {
      const sx = 12 + i * 11.2;
      const sz = 48;
      const smShadow = new THREE.Mesh(
        new THREE.CircleGeometry(4.8, 20),
        new THREE.MeshBasicMaterial({ color: 0x15181a, transparent: true, opacity: 0.75 }),
      );
      smShadow.rotation.x = -Math.PI / 2;
      smShadow.position.set(sx - 1.8, 0.3, sz - 1.8);
      siloGridGroup.add(smShadow);

      const smCyl = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 12, 20), siloWallMat);
      smCyl.position.set(sx, 6, sz);
      smCyl.castShadow = true;
      registerZone(smCyl, "silos");
      siloGridGroup.add(smCyl);

      const smCone = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.6, 20), siloRoofMat);
      smCone.position.set(sx, 13.3, sz);
      siloGridGroup.add(smCone);
    }

    // 3. WESTERN SHED + CENTRAL PROCESSING BUILDINGS
    buildUVWarehouse({
      u: 0.358,
      v: 0.375,
      uw: 0.095,
      uv_d: 0.044,
      h: 11.5,
      roofColor: 0xd5d8d0,
      rotY: TILT_ANGLE,
      curved: true,
      zoneKey: "ampha",
      ribs: 7,
    });
    buildUVWarehouse({
      u: 0.448,
      v: 0.392,
      uw: 0.052,
      uv_d: 0.044,
      h: 13,
      roofColor: 0xdce0d8,
      rotY: TILT_ANGLE,
      curved: false,
      zoneKey: "ampha",
      ribs: 5,
    });
    buildUVWarehouse({
      u: 0.512,
      v: 0.368,
      uw: 0.088,
      uv_d: 0.048,
      h: 14,
      roofColor: 0xb8bdb6,
      rotY: TILT_ANGLE,
      curved: false,
      zoneKey: "ampha",
      ribs: 10,
    });

    // 4. FOUR LARGE WHITE-ROOFED WAREHOUSES
    buildUVWarehouse({
      u: 0.554,
      v: 0.436,
      uw: 0.084,
      uv_d: 0.062,
      h: 13.5,
      roofColor: 0xd7dbd4,
      rotY: TILT_ANGLE,
      curved: true,
      zoneKey: "ampha",
      ribs: 7,
    });
    buildUVWarehouse({
      u: 0.675,
      v: 0.452,
      uw: 0.098,
      uv_d: 0.058,
      h: 13.5,
      roofColor: 0xd6dad2,
      rotY: TILT_ANGLE,
      curved: true,
      zoneKey: "ampha",
      ribs: 8,
    });
    buildUVWarehouse({
      u: 0.604,
      v: 0.568,
      uw: 0.086,
      uv_d: 0.066,
      h: 14,
      roofColor: 0xd8dcd4,
      rotY: TILT_ANGLE,
      curved: true,
      zoneKey: "warehouses",
      ribs: 7,
    });
    buildUVWarehouse({
      u: 0.608,
      v: 0.686,
      uw: 0.096,
      uv_d: 0.096,
      h: 15,
      roofColor: 0xd5d9d1,
      rotY: TILT_ANGLE,
      curved: true,
      zoneKey: "warehouses",
      ribs: 9,
    });
    buildUVWarehouse({
      u: 0.662,
      v: 0.666,
      uw: 0.022,
      uv_d: 0.032,
      h: 9,
      roofColor: 0xe2e5de,
      rotY: TILT_ANGLE,
      curved: false,
      zoneKey: "warehouses",
      ribs: 3,
    });

    // 5. TMP RICE MILL BUILDINGS
    buildUVWarehouse({
      u: 0.226,
      v: 0.718,
      uw: 0.048,
      uv_d: 0.032,
      h: 10,
      roofColor: 0xcfcac0,
      rotY: TILT_ANGLE,
      curved: false,
      zoneKey: "tmp",
      ribs: 5,
    });
    buildUVWarehouse({
      u: 0.195,
      v: 0.742,
      uw: 0.025,
      uv_d: 0.022,
      h: 7,
      roofColor: 0xd8d4cb,
      rotY: TILT_ANGLE,
      curved: false,
      zoneKey: "tmp",
      ribs: 3,
    });

    // ========================================================================
    // 4. PIXEL-ACCURATE GOOGLE MAPS GREY ROADS OVERLAY
    // ========================================================================
    const roadNetworkGroup = new THREE.Group();
    scene.add(roadNetworkGroup);
    stateRef.current.roadNetworkGroup = roadNetworkGroup;

    const gmapRoadFillMat = new THREE.MeshBasicMaterial({ color: 0x8d9298 });
    const gmapRoadCasingMat = new THREE.MeshBasicMaterial({ color: 0x5c6168 });

    function addUVRoadPolyline(uvPts: number[][], roadW = 6.2, y = 0.65) {
      const group = new THREE.Group();
      const pts = uvPts.map((p) => new THREE.Vector2(uToX(p[0]), vToZ(p[1])));

      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const len = p1.distanceTo(p2);
        const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const mx = (p1.x + p2.x) / 2;
        const mz = (p1.y + p2.y) / 2;

        const casing = new THREE.Mesh(new THREE.PlaneGeometry(len + roadW * 0.5, roadW + 1.8), gmapRoadCasingMat);
        casing.rotation.x = -Math.PI / 2;
        casing.rotation.z = -ang;
        casing.position.set(mx, y - 0.05, mz);
        group.add(casing);

        const fill = new THREE.Mesh(new THREE.PlaneGeometry(len + roadW * 0.35, roadW), gmapRoadFillMat);
        fill.rotation.x = -Math.PI / 2;
        fill.rotation.z = -ang;
        fill.position.set(mx, y, mz);
        group.add(fill);
      }
      roadNetworkGroup.add(group);
    }

    addUVRoadPolyline([[0.318, 0.0], [0.368, 0.118]], 6.0);
    addUVRoadPolyline(
      [
        [0.522, 0.0],
        [0.538, 0.035],
        [0.642, 0.0],
        [0.658, 0.0],
        [0.695, 0.088],
        [0.858, 0.012],
        [0.865, 0.025],
        [0.742, 0.175],
        [0.822, 0.142],
        [0.922, 0.425],
        [0.835, 0.468],
        [0.875, 0.585],
        [0.815, 0.618],
        [0.875, 0.775],
        [0.718, 0.855],
        [0.732, 0.905],
        [0.515, 1.0],
      ],
      6.4,
    );
    addUVRoadPolyline([[0.695, 1.0], [1.0, 0.748]], 6.8);
    addUVRoadPolyline([[0.752, 1.0], [0.818, 0.945], [0.838, 1.0]], 6.0);
    addUVRoadPolyline([[0.0, 0.935], [0.185, 0.852], [0.248, 1.0]], 6.2);
    addUVRoadPolyline([[0.185, 0.768], [0.142, 0.648], [0.238, 0.598], [0.235, 0.568], [0.172, 0.455]], 6.0);
    addUVRoadPolyline([[0.518, 0.068], [0.545, 0.098], [0.548, 0.145], [0.575, 0.212], [0.535, 0.238]], 6.0);
    addUVRoadPolyline([[0.398, 0.658], [0.518, 0.602]], 6.0);
    addUVRoadPolyline([[0.455, 0.440], [0.548, 0.708]], 6.0);
    addUVRoadPolyline([[0.455, 0.440], [0.578, 0.382]], 5.8);
    addUVRoadPolyline([[0.482, 0.515], [0.735, 0.392]], 5.8);
    addUVRoadPolyline([[0.582, 0.765], [0.672, 0.722]], 5.8);

    // ========================================================================
    // 5. EXACT GOOGLE MAPS BLUE NAVIGATION ROUTE + 4 WHITE WAYPOINT DOTS
    // ========================================================================
    const routeGroup = new THREE.Group();
    scene.add(routeGroup);
    stateRef.current.routeGroup = routeGroup;

    const blueRouteUV = [
      [0.000, 0.858],
      [0.185, 0.765],
      [0.205, 0.780],
      [0.232, 0.772],
      [0.275, 0.718],
      [0.398, 0.658],
      [0.264, 0.335],
      [0.262, 0.305],
      [0.285, 0.282],
      [0.452, 0.198],
      [0.468, 0.225],
      [0.488, 0.215],
      [0.508, 0.254],
      [0.535, 0.238],
    ];

    const blueWaypoints3D = blueRouteUV.map((p) => new THREE.Vector3(uToX(p[0]), 1.4, vToZ(p[1])));
    const routeBorderMat = new THREE.MeshBasicMaterial({ color: 0x0f178a });
    const routeCoreMat = new THREE.MeshBasicMaterial({ color: 0x323fff });

    for (let i = 0; i < blueWaypoints3D.length - 1; i++) {
      const p1 = blueWaypoints3D[i];
      const p2 = blueWaypoints3D[i + 1];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len = Math.hypot(dx, dz);
      const ang = Math.atan2(dz, dx);
      const mx = (p1.x + p2.x) / 2;
      const mz = (p1.z + p2.z) / 2;

      const outerSeg = new THREE.Mesh(new THREE.PlaneGeometry(len, 14.5), routeBorderMat);
      outerSeg.rotation.x = -Math.PI / 2;
      outerSeg.rotation.z = -ang;
      outerSeg.position.set(mx, 1.15, mz);
      routeGroup.add(outerSeg);

      const innerSeg = new THREE.Mesh(new THREE.PlaneGeometry(len, 10.0), routeCoreMat);
      innerSeg.rotation.x = -Math.PI / 2;
      innerSeg.rotation.z = -ang;
      innerSeg.position.set(mx, 1.35, mz);
      routeGroup.add(innerSeg);
    }

    blueWaypoints3D.forEach((pt) => {
      const outerJoint = new THREE.Mesh(new THREE.CircleGeometry(7.25, 24), routeBorderMat);
      outerJoint.rotation.x = -Math.PI / 2;
      outerJoint.position.set(pt.x, 1.15, pt.z);
      routeGroup.add(outerJoint);

      const innerJoint = new THREE.Mesh(new THREE.CircleGeometry(5.0, 24), routeCoreMat);
      innerJoint.rotation.x = -Math.PI / 2;
      innerJoint.position.set(pt.x, 1.35, pt.z);
      routeGroup.add(innerJoint);
    });

    const dotIndices = [1, 5, 9, 13];
    const dotWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dotRingMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });

    dotIndices.forEach((idx) => {
      const pt = blueWaypoints3D[idx];
      const ring = new THREE.Mesh(new THREE.CircleGeometry(3.8, 24), dotRingMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pt.x, 1.55, pt.z);
      routeGroup.add(ring);

      const dot = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), dotWhiteMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(pt.x, 1.65, pt.z);
      routeGroup.add(dot);
    });

    const routeCurve = new THREE.CatmullRomCurve3(blueWaypoints3D, false, "catmullrom", 0.05);
    stateRef.current.routeCurve = routeCurve;

    const gpsTrackerGroup = new THREE.Group();
    const trackerDot = new THREE.Mesh(
      new THREE.CircleGeometry(3.8, 24),
      new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.9 }),
    );
    trackerDot.rotation.x = -Math.PI / 2;
    gpsTrackerGroup.add(trackerDot);
    routeGroup.add(gpsTrackerGroup);
    stateRef.current.gpsTrackerGroup = gpsTrackerGroup;
    stateRef.current.trackerDot = trackerDot;

    // ========================================================================
    // 6. ZONE DEFINITIONS & DOM MARKER ANCHORS
    // ========================================================================
    const zones: Record<string, ZoneInfo> = {
      smt: {
        badge: "จุดหมายปลายทาง (Red Pin)",
        title: "SMT Biomass (WC2Q+7H5)",
        desc: "โรงไฟฟ้าและแปรรูปพลังงานชีวมวล ตั้งอยู่ทิศเหนือสุดของโครงการ พร้อมลานกองแกลบชีวมวลสีส้มทองด้านขวา เชื่อมต่อกับกลุ่มไซโล 16 ลูก และบ่อบำบัดน้ำ 6 บ่อ",
        coords: "WC2Q+7H5 ต.เขาสมอคอน อ.ท่าวุ้ง จ.ลพบุรี 15180",
        anchor: new THREE.Vector3(uToX(0.525), 14, vToZ(0.214)),
        camPos: new THREE.Vector3(uToX(0.525), 260, vToZ(0.38)),
        camTarget: new THREE.Vector3(uToX(0.50), 6, vToZ(0.18)),
      },
      silos: {
        badge: "คลังไซโล (4×4 Silo Grid)",
        title: "กลุ่มไซโล 16 ลูก (4×4) + ถังพัก 5 ลูก",
        desc: "กลุ่มไซโลโลหะทรงกระบอกขนาดใหญ่จัดเรียงแบบ 4×4 จำนวน 16 ลูก พร้อมสะพานลำเลียงด้านบน และถังไซโลขนาดย่อยอีก 5 ลูกทางฝั่งตะวันออกเฉียงใต้",
        coords: "โซนกลาง-เหนือ (ติดมุมเลี้ยวเส้นทางสีน้ำเงิน)",
        anchor: new THREE.Vector3(uToX(0.418), 18, vToZ(0.282)),
        camPos: new THREE.Vector3(uToX(0.32), 230, vToZ(0.46)),
        camTarget: new THREE.Vector3(uToX(0.43), 10, vToZ(0.29)),
      },
      ampha: {
        badge: "วิศวกรรมและคลังสินค้า",
        title: "บริษัท อำภา วิศวกรรม จำกัด",
        desc: "กลุ่มอาคารวิศวกรรม โรงงานแปรรูปกลาง และคลังสินค้าฝั่งตะวันออก ติดกับบ่อบำบัดน้ำ 6 บ่อและอ่างเก็บน้ำด้านตะวันออก",
        coords: "VCXQ+MX ต.เขาสมอคอน อ.ท่าวุ้ง จ.ลพบุรี 15180",
        anchor: new THREE.Vector3(uToX(0.608), 8, vToZ(0.358)),
        camPos: new THREE.Vector3(uToX(0.68), 280, vToZ(0.58)),
        camTarget: new THREE.Vector3(uToX(0.55), 8, vToZ(0.39)),
      },
      warehouses: {
        badge: "คลังสินค้าขนาดใหญ่ (4 อาคาร)",
        title: "กลุ่มโกดังหลังคาโค้งสีขาว (โซนใต้)",
        desc: "อาคารคลังสินค้าหลังคาขาวขนาดใหญ่ 4 หลัง เรียงตัวตามแนวแกนเฉียงของโครงการ พร้อมถนนคอนกรีตเชื่อมต่อเป็นตาราง",
        coords: "โซนทิศใต้-ตะวันออกของโครงการ",
        anchor: new THREE.Vector3(uToX(0.695), 6, vToZ(0.713)),
        camPos: new THREE.Vector3(uToX(0.78), 310, vToZ(0.88)),
        camTarget: new THREE.Vector3(uToX(0.60), 8, vToZ(0.58)),
      },
      tmp: {
        badge: "จุดเริ่มต้นเข้าโครงการ",
        title: "TMP Rice Mill (โรงสีที.เอ็ม.พี.)",
        desc: "อาคารโรงสีข้าวและจุดผ่านเข้า-ออกหลักทางทิศตะวันตกเฉียงใต้ของโครงการ จุดที่เส้นทางนำทางสีน้ำเงินเลี้ยวเข้าสู่ถนนหลักภายในโครงการ",
        coords: "VCWP+C83 ต.เขาสมอคอน อ.ท่าวุ้ง จ.ลพบุรี 15180",
        anchor: new THREE.Vector3(uToX(0.189), 8, vToZ(0.708)),
        camPos: new THREE.Vector3(uToX(0.12), 230, vToZ(0.92)),
        camTarget: new THREE.Vector3(uToX(0.23), 5, vToZ(0.72)),
      },
    };
    stateRef.current.zones = zones;

    // Initial Camera Mode
    const vFovRad = THREE.MathUtils.degToRad(camera.fov);
    const hForHeight = (MAP_H * 0.52) / Math.tan(vFovRad / 2);
    const hForWidth = (MAP_W * 0.52) / (Math.tan(vFovRad / 2) * camera.aspect);
    const overheadH = Math.min(hForHeight, hForWidth) * 1.05;

    camera.position.set(0, overheadH, 0.5);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();

    // Raycaster for clicking 3D buildings
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downTime = 0;

    const onPointerDown = () => {
      downTime = performance.now();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (performance.now() - downTime > 220) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactableMeshes, false);
      if (hits.length > 0 && hits[0].object.userData.zoneKey) {
        const key = hits[0].object.userData.zoneKey;
        const z = zones[key];
        if (z) {
          setActiveZoneKey(key);
          setIsInfoCardOpen(true);
          const startPos = camera.position.clone();
          const startLook = controls.target.clone();
          const startTime = performance.now();
          stateRef.current.camAnim = (now: number) => {
            const t = Math.min(1, (now - startTime) / 950);
            const ease = 1 - Math.pow(1 - t, 3);
            camera.position.lerpVectors(startPos, z.camPos, ease);
            controls.target.lerpVectors(startLook, z.camTarget, ease);
            if (t >= 1) stateRef.current.camAnim = null;
          };
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    // References for State
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    stateRef.current.renderer = renderer;
    stateRef.current.controls = controls;

    const tempV = new THREE.Vector3();
    const markerAnchorList = [
      { ref: markerSmtRef, pos: zones.smt.anchor, isWatermark: false },
      { ref: markerAmphaRef, pos: zones.ampha.anchor, isWatermark: false },
      { ref: markerTmpRef, pos: zones.tmp.anchor, isWatermark: false },
      { ref: markerSeRef, pos: zones.warehouses.anchor, isWatermark: false },
      { ref: markerWatermarkRef, pos: new THREE.Vector3(uToX(0.635), 16, vToZ(0.715)), isWatermark: true },
    ];

    // Animation Loop
    const animate = () => {
      stateRef.current.animFrameId = requestAnimationFrame(animate);
      const dt = stateRef.current.clock.getDelta();
      const now = performance.now();

      // GPS pulse along blue route
      if (stateRef.current.routeCurve && stateRef.current.gpsTrackerGroup && stateRef.current.trackerDot) {
        stateRef.current.routeProgress = (stateRef.current.routeProgress + dt * 0.085) % 1;
        const trackerPos = stateRef.current.routeCurve.getPointAt(stateRef.current.routeProgress);
        stateRef.current.gpsTrackerGroup.position.set(trackerPos.x, 1.8, trackerPos.z);
        const pulse = 0.85 + 0.35 * Math.sin(now * 0.008);
        stateRef.current.trackerDot.scale.set(pulse, pulse, 1);

        if (stateRef.current.isFollowingRoute) {
          const lookAheadT = Math.min(1, (stateRef.current.routeProgress + 0.065) % 1);
          const lookPt = stateRef.current.routeCurve.getPointAt(lookAheadT);
          const desiredCam = new THREE.Vector3(trackerPos.x - 40, 115, trackerPos.z + 90);
          camera.position.lerp(desiredCam, 0.06);
          controls.target.lerp(new THREE.Vector3(lookPt.x, 6, lookPt.z), 0.08);
        }
      }

      if (stateRef.current.camAnim) {
        stateRef.current.camAnim(now);
      }

      controls.update();

      // Synchronize 2D floating markers
      if (stateRef.current.layers.labels) {
        const curW = container.clientWidth || window.innerWidth;
        const curH = container.clientHeight || window.innerHeight;
        const halfW = curW / 2;
        const halfH = curH / 2;

        markerAnchorList.forEach((m) => {
          const el = m.ref.current;
          if (!el) return;
          tempV.copy(m.pos);
          tempV.project(camera);

          if (tempV.z > 1) {
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
            return;
          }
          const x = tempV.x * halfW + halfW;
          const y = -(tempV.y * halfH) + halfH;
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.opacity = "1";
          if (!m.isWatermark) {
            el.style.pointerEvents = "auto";
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth || window.innerWidth;
      const nh = container.clientHeight || window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(stateRef.current.animFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Camera Animation Helper
  const animateCameraTo = useCallback(
    (targetPos: THREE.Vector3, targetLookAt: THREE.Vector3, duration = 950) => {
      const cam = stateRef.current.camera;
      const ctrl = stateRef.current.controls;
      if (!cam || !ctrl) return;

      setIsFollowingRoute(false);
      const startPos = cam.position.clone();
      const startLook = ctrl.target.clone();
      const startTime = performance.now();

      stateRef.current.camAnim = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        cam.position.lerpVectors(startPos, targetPos, ease);
        ctrl.target.lerpVectors(startLook, targetLookAt, ease);
        if (t >= 1) {
          stateRef.current.camAnim = null;
        }
      };
    },
    [],
  );

  const handleSetCameraMode = (mode: "satellite" | "isometric") => {
    setActiveCameraMode(mode);
    setIsFollowingRoute(false);
    const cam = stateRef.current.camera;
    if (!cam) return;

    if (mode === "satellite") {
      const vFovRad = THREE.MathUtils.degToRad(cam.fov);
      const hForHeight = (940 * 0.52) / Math.tan(vFovRad / 2);
      const hForWidth = (1040 * 0.52) / (Math.tan(vFovRad / 2) * cam.aspect);
      const overheadH = Math.min(hForHeight, hForWidth) * 1.05;
      animateCameraTo(new THREE.Vector3(0, overheadH, 0.5), new THREE.Vector3(0, 0, 0), 900);
    } else if (mode === "isometric") {
      animateCameraTo(new THREE.Vector3(-340, 560, 580), new THREE.Vector3(20, 0, -20), 1100);
    }
  };

  const handleFocusLocation = (key: string) => {
    const z = stateRef.current.zones[key];
    if (!z) return;
    setActiveZoneKey(key);
    setIsInfoCardOpen(true);
    animateCameraTo(z.camPos, z.camTarget, 950);
  };

  const handleToggleRouteTour = () => {
    setIsFollowingRoute((prev) => {
      const next = !prev;
      if (next) {
        stateRef.current.routeProgress = 0.01;
      }
      return next;
    });
  };

  const handleToggleLayer = (layer: "route" | "roads" | "labels" | "relief") => {
    const nextVal = !layers[layer];
    setLayers((prev) => ({ ...prev, [layer]: nextVal }));

    if (layer === "route" && stateRef.current.routeGroup) {
      stateRef.current.routeGroup.visible = nextVal;
    } else if (layer === "roads" && stateRef.current.roadNetworkGroup) {
      stateRef.current.roadNetworkGroup.visible = nextVal;
    } else if (layer === "labels") {
      // Handled via stateRef.current.layers.labels check in animate loop
    } else if (layer === "relief" && stateRef.current.structures3DGroup) {
      stateRef.current.structures3DGroup.scale.y = nextVal ? 1.0 : 0.08;
    }
  };

  const currentZone = stateRef.current.zones[activeZoneKey] || {
    badge: "จุดหมายปลายทาง (Destination)",
    title: "SMT Biomass (WC2Q+7H5)",
    desc: "โรงไฟฟ้าและแปรรูปชีวมวลด้านทิศเหนือ พร้อมลานกองแกลบสีส้มทองด้านขวา เชื่อมต่อกับไซโล 16 ลูก และบ่อบำบัดน้ำ 6 บ่อ",
    coords: "พิกัด: 14.9007° N, 100.4389° E",
  };

  return (
    <div
      id="smt-biomass-container"
      className={
        isFullscreen
          ? "fixed inset-0 z-[99999] w-screen h-screen bg-[#121714] text-slate-100 overflow-hidden font-sans select-none"
          : "relative w-full h-[calc(100dvh-72px)] bg-[#121714] text-slate-100 overflow-hidden font-sans select-none"
      }
    >
      <style jsx>{`
        .glass-panel {
          background: rgba(15, 20, 28, 0.84);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        }
        .hud-btn {
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hud-btn:hover {
          background: rgba(59, 130, 246, 0.25);
          border-color: rgba(96, 165, 250, 0.55);
          transform: translateY(-1px);
        }
        .hud-btn.active {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          border-color: #60a5fa;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
        }
        #labels-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 10;
        }
        .map-marker {
          position: absolute;
          pointer-events: auto;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.75));
        }
        .pin-poi-left {
          transform: translate(-15px, -50%);
        }
        .pin-poi-left:hover {
          transform: translate(-15px, -50%) scale(1.07);
          z-index: 30;
        }
        .pin-center {
          transform: translate(-50%, -50%);
        }
        .pin-center:hover {
          transform: translate(-50%, -50%) scale(1.1);
          z-index: 30;
        }
        .red-pin-wrapper {
          transform: translate(-50%, -100%);
          flex-direction: column;
          gap: 0px;
        }
        .red-pin-wrapper:hover {
          transform: translate(-50%, -103%) scale(1.1);
          z-index: 35;
        }
        .gmap-label-text {
          font-family: "Sarabun", "Inter", sans-serif;
          font-weight: 700;
          font-size: 13.5px;
          line-height: 1.18;
          color: #ffffff;
          text-shadow:
            -1.6px -1.6px 0 #1f2421,
            1.6px -1.6px 0 #1f2421,
            -1.6px 1.6px 0 #1f2421,
            1.6px 1.6px 0 #1f2421,
            0px -1.6px 0 #1f2421,
            0px 1.6px 0 #1f2421,
            -1.6px 0px 0 #1f2421,
            1.6px 0px 0 #1f2421,
            0px 2px 4px rgba(0, 0, 0, 0.95);
          white-space: nowrap;
          letter-spacing: 0.01em;
        }
        .gmap-subtext {
          font-size: 11.2px;
          font-weight: 700;
        }
        .watermark-google {
          position: absolute;
          pointer-events: none;
          transform: translate(-50%, -50%);
          font-family: "Inter", sans-serif;
          font-weight: 600;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.22);
          letter-spacing: 0.03em;
        }
      `}</style>

      {/* 3D WebGL Canvas */}
      <div id="canvas-container" ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Floating Google Maps Style 2D/3D Synchronized Markers */}
      <div id="labels-container" style={{ display: layers.labels ? "block" : "none" }}>
        {/* 1. Red Teardrop Pin: SMT Biomass */}
        <div
          id="marker-smt"
          ref={markerSmtRef}
          className="map-marker red-pin-wrapper"
          onClick={() => handleFocusLocation("smt")}
        >
          <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M15 1C7.26801 1 1 7.26801 1 15C1 24.75 15 40.5 15 40.5C15 40.5 29 24.75 29 15C29 7.26801 22.732 1 15 1Z"
              fill="#EA4335"
              stroke="#991B1B"
              strokeWidth="1.4"
            />
            <circle cx="15" cy="14.5" r="5.2" fill="#7F1D1D" />
          </svg>
        </div>

        {/* 2. บริษัท อำภา วิศวกรรม จำกัด */}
        <div
          id="marker-ampha"
          ref={markerAmphaRef}
          className="map-marker pin-poi-left"
          onClick={() => handleFocusLocation("ampha")}
        >
          <div className="relative flex items-center justify-center shrink-0">
            <svg width="30" height="36" viewBox="0 0 30 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 1.5C7.54416 1.5 1.5 7.54416 1.5 15C1.5 23.8 15 34.2 15 34.2C15 34.2 28.5 23.8 28.5 15C28.5 7.54416 22.4558 1.5 15 1.5Z"
                fill="#FFFFFF"
                stroke="#475569"
                strokeWidth="1.6"
              />
              <circle cx="15" cy="15" r="9.2" fill="#70757A" />
              <circle cx="15" cy="15" r="4.0" fill="#FFFFFF" />
            </svg>
          </div>
          <div className="flex flex-col text-left">
            <span className="gmap-label-text">บริษัท อำภา</span>
            <span className="gmap-label-text">วิศวกรรม จำกัด</span>
          </div>
        </div>

        {/* 3. TMP Rice Mill / โรงสีที.เอ็ม.พี. */}
        <div
          id="marker-tmp"
          ref={markerTmpRef}
          className="map-marker pin-poi-left"
          onClick={() => handleFocusLocation("tmp")}
        >
          <div className="relative flex items-center justify-center shrink-0">
            <svg width="30" height="36" viewBox="0 0 30 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 1.5C7.54416 1.5 1.5 7.54416 1.5 15C1.5 23.8 15 34.2 15 34.2C15 34.2 28.5 23.8 28.5 15C28.5 7.54416 22.4558 1.5 15 1.5Z"
                fill="#FFFFFF"
                stroke="#475569"
                strokeWidth="1.6"
              />
              <circle cx="15" cy="15" r="9.2" fill="#70757A" />
              <circle cx="15" cy="15" r="4.0" fill="#FFFFFF" />
            </svg>
          </div>
          <div className="flex flex-col text-left">
            <span className="gmap-label-text">TMP Rice Mill</span>
            <span className="gmap-label-text gmap-subtext">โรงสีที.เอ็ม.พี</span>
          </div>
        </div>

        {/* 4. Secondary South-East Round Pin Icon */}
        <div
          id="marker-se"
          ref={markerSeRef}
          className="map-marker pin-center"
          onClick={() => handleFocusLocation("warehouses")}
        >
          <svg width="21" height="21" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="9.2" fill="#FFFFFF" stroke="#334155" strokeWidth="1.6" />
            <path
              d="M11 4.8C8.1 4.8 5.8 7.1 5.8 10C5.8 13.7 11 17.4 11 17.4C11 17.4 16.2 13.7 16.2 10C16.2 7.1 13.9 4.8 11 4.8Z"
              fill="#70757A"
            />
            <circle cx="11" cy="9.8" r="2.2" fill="#FFFFFF" />
          </svg>
        </div>

        {/* 5. Google Watermark */}
        <div id="marker-watermark" ref={markerWatermarkRef} className="watermark-google">
          Google
        </div>
      </div>

      {/* Top Header & Camera Presets HUD */}
      <header className="fixed top-2.5 left-2.5 right-2.5 z-20 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-2 pointer-events-none">
        {/* Brand / Location Info */}
        <div className="glass-panel rounded-2xl px-3.5 py-2.5 pointer-events-auto flex items-center gap-3 max-w-full">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center shadow-lg shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">
                SMT Biomass — 1:1 Satellite 3D Replica
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                WC2Q+7H5
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              ต.เขาสมอคอน อ.ท่าวุ้ง จ.ลพบุรี 15180 • คลิกหมุน 3D หรือกดปุ่มมุมมองดาวเทียม 1:1
            </p>
          </div>
        </div>

        {/* Quick Camera View Mode Buttons */}
        <div className="glass-panel rounded-2xl p-1.5 pointer-events-auto flex flex-wrap items-center gap-1.5">
          <button
            id="btn-cam-sat"
            type="button"
            onClick={() => handleSetCameraMode("satellite")}
            className={`hud-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              activeCameraMode === "satellite" && !isFollowingRoute ? "active" : "text-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            มุมมองดาวเทียม 1:1 (ตรงภาพต้นฉบับเป๊ะ)
          </button>

          <button
            id="btn-cam-iso"
            type="button"
            onClick={() => handleSetCameraMode("isometric")}
            className={`hud-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              activeCameraMode === "isometric" && !isFollowingRoute ? "active" : "text-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            มุมมอง 3D Isometric
          </button>

          <button
            id="btn-cam-tour"
            type="button"
            onClick={handleToggleRouteTour}
            className={`hud-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              isFollowingRoute ? "active" : "text-blue-300"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{isFollowingRoute ? "หยุดบินตามเส้นทาง" : "วิ่งตามเส้นทางสีน้ำเงิน"}</span>
          </button>

          <button
            id="btn-toggle-ui"
            type="button"
            onClick={() => setIsHudHidden(!isHudHidden)}
            className={`hud-btn px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              isHudHidden ? "active" : "text-slate-300"
            }`}
            title="ซ่อน/แสดงแผงเมนูเพื่อเทียบภาพเต็มจอ"
          >
            {isHudHidden ? "แสดงเมนู" : "ซ่อนเมนู"}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="hud-btn px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 cursor-pointer"
            title="ขยาย/ย่อเต็มจอ"
          >
            {isFullscreen ? "ย่อจอ" : "เต็มจอ"}
          </button>

          {onOpenInterior && (
            <button
              type="button"
              onClick={onOpenInterior}
              className="hud-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-500 text-white border-emerald-400/40 flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span>ผังภายในคลัง</span>
            </button>
          )}
        </div>
      </header>

      {/* Left Collapsible Sidebar: Zone Directory & Layer Controls */}
      <aside
        id="side-panel"
        className={`fixed bottom-3 left-3 z-20 flex flex-col gap-2 w-68 sm:w-72 max-h-[calc(100vh-110px)] pointer-events-none transition-opacity duration-200 ${
          isHudHidden ? "opacity-0 pointer-events-none" : ""
        }`}
      >
        <div className="glass-panel rounded-2xl p-3 pointer-events-auto overflow-y-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              จุดสำคัญในแผนที่ (Zones)
            </span>
            <button
              type="button"
              onClick={() => handleSetCameraMode("satellite")}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
            >
              มุมตรง 1:1
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1">
            <button
              type="button"
              onClick={() => handleFocusLocation("smt")}
              className="hud-btn text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-red-300">SMT Biomass (หมุดแดง)</div>
                  <div className="text-[10px] text-slate-400">โรงไฟฟ้าชีวมวล + กองแกลบสีส้ม</div>
                </div>
              </div>
              <span className="text-xs text-slate-400">↗</span>
            </button>

            <button
              type="button"
              onClick={() => handleFocusLocation("silos")}
              className="hud-btn text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0"></span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-sky-300">
                    กลุ่มไซโล 4×4 (16 ลูก) + 5 ถัง
                  </div>
                  <div className="text-[10px] text-slate-400">ไซโลโลหะสะท้อนแสง + สะพานลำเลียง</div>
                </div>
              </div>
              <span className="text-xs text-slate-400">↗</span>
            </button>

            <button
              type="button"
              onClick={() => handleFocusLocation("ampha")}
              className="hud-btn text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300">บจก. อำภา วิศวกรรม</div>
                  <div className="text-[10px] text-slate-400">อาคารโรงงานกลาง + บ่อบำบัดน้ำ 6 บ่อ</div>
                </div>
              </div>
              <span className="text-xs text-slate-400">↗</span>
            </button>

            <button
              type="button"
              onClick={() => handleFocusLocation("warehouses")}
              className="hud-btn text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">กลุ่มโกดังขนาดใหญ่ 4 หลัง</div>
                  <div className="text-[10px] text-slate-400">คลังสินค้าหลังคาขาวโซนตะวันออก-ใต้</div>
                </div>
              </div>
              <span className="text-xs text-slate-400">↗</span>
            </button>

            <button
              type="button"
              onClick={() => handleFocusLocation("tmp")}
              className="hud-btn text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0"></span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-300">TMP Rice Mill (โรงสีที.เอ็ม.พี)</div>
                  <div className="text-[10px] text-slate-400">ทางเข้าหลักฝั่งตะวันตกเฉียงใต้</div>
                </div>
              </div>
              <span className="text-xs text-slate-400">↗</span>
            </button>
          </div>

          {/* Layer Toggles */}
          <div className="mt-2.5 pt-2 border-t border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              เลเยอร์แผนที่ (Layers)
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => handleToggleLayer("route")}
                className={`hud-btn px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  layers.route ? "active" : "text-slate-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#3644ff]"></span> เส้นทางสีน้ำเงิน
              </button>
              <button
                type="button"
                onClick={() => handleToggleLayer("roads")}
                className={`hud-btn px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  layers.roads ? "active" : "text-slate-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#8f949a]"></span> ถนนสีเทา
              </button>
              <button
                type="button"
                onClick={() => handleToggleLayer("labels")}
                className={`hud-btn px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  layers.labels ? "active" : "text-slate-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-400"></span> หมุดป้ายชื่อ
              </button>
              <button
                type="button"
                onClick={() => handleToggleLayer("relief")}
                className={`hud-btn px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  layers.relief ? "active" : "text-slate-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> ความสูง 3D
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Inspection Card */}
      {isInfoCardOpen && !isHudHidden && (
        <div
          id="info-card"
          className="fixed bottom-3 right-3 z-20 w-68 sm:w-76 glass-panel rounded-2xl p-3.5 pointer-events-auto transition-all duration-300"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                id="info-badge"
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30"
              >
                {currentZone.badge}
              </span>
              <h2 id="info-title" className="text-xs sm:text-sm font-bold text-white mt-1">
                {currentZone.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsInfoCardOpen(false)}
              className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p id="info-desc" className="text-[11px] text-slate-300 mt-1 leading-relaxed">
            {currentZone.desc}
          </p>
          <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span id="info-coords">{currentZone.coords}</span>
            <span className="text-blue-300 font-medium">คลิกอาคารเพื่อดูรายละเอียด</span>
          </div>
        </div>
      )}
    </div>
  );
};
