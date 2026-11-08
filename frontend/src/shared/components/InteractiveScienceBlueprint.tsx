import { useEffect, useRef } from "react";

export function InteractiveScienceBlueprint() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animId = 0;
    let disposed = false;
    let onMouseMove: ((e: MouseEvent) => void) | null = null;
    let onResize: (() => void) | null = null;
    let renderer: any = null;

    const initScene = () => {
      if (disposed || !container) return;
      const THREE = (window as any).THREE;
      if (!THREE) return;

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 42);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.top = "0";
      renderer.domElement.style.left = "0";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.pointerEvents = "none";
      container.appendChild(renderer.domElement);

      /* --- SCENE GENERATION --- */
  // High-contrast, clean tactile blueprint palette
  const colCharcoal = 0x1e242b;
  const colTerracotta = 0xc85a3a;
  const colSage = 0x3d6b52;
  const colBlue = 0x1e40af;
  const colGold = 0xb45309;
  const colSlate = 0x475569;

  // We structure the scene into cleanly separated spatial zones across the entire viewport:
  // Center Card exclusion zone: x in [-6.8, 6.8], y in [-6.5, 7.5] is kept 100% CLEAR
  // Zone 1: TOP-LEFT QUADRANT (x: -15, y: 7.5) -> Benzene Molecular Ring & Chemical Formula Matrix
  // Zone 2: MID-LEFT FLANK (x: -14.5, y: -1.0) -> Complete Chemistry Rig: Retort stand, Florence boiling flask, burner, test tubes
  // Zone 3: TOP-RIGHT QUADRANT (x: 14.5, y: 8.5) -> Kinetic Mechanical Planetary Gears & Transmission Linkage
  // Zone 4: MID-RIGHT FLANK (x: 14.0, y: -1.5) -> Precision Optical Microscope Blueprint & Rutherford-Bohr Atomic Orbitals
  // Zone 5: BOTTOM FULL-WIDTH TIER (y: -11.5) -> Harmonic wave spectrum & Mobile Lab Expedition Route with traveling rover

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  function createThickLine(points: any[], color: any, opacity = 0.85, isLoop = false): any {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: 2 });
    return isLoop ? new THREE.LineLoop(geo, mat) : new THREE.Line(geo, mat);
  }

  function createSegments(points: any[], color: any, opacity = 0.8): any {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: 1.5 });
    return new THREE.LineSegments(geo, mat);
  }

  // =========================================================================
  // 1. TOP-LEFT: BENZENE MOLECULAR MATRIX & ORGANIC BONDS
  // Sits comfortably in top-left empty space without getting cut off
  // =========================================================================
  const topLeftGroup = new THREE.Group();
  topLeftGroup.position.set(-14.5, 7.8, 0);
  rootGroup.add(topLeftGroup);

  const hexRad = 1.8;
  const hexPts = [];
  for (let h = 0; h <= 6; h++) {
    const ha = (h / 6) * Math.PI * 2;
    hexPts.push(new THREE.Vector3(Math.cos(ha) * hexRad, Math.sin(ha) * hexRad, 0));
  }
  topLeftGroup.add(createThickLine(hexPts, colCharcoal, 0.75));

  // Inner resonance ring
  const innerHexPts = [];
  for (let ih = 0; ih <= 36; ih++) {
    const iha = (ih / 36) * Math.PI * 2;
    innerHexPts.push(new THREE.Vector3(Math.cos(iha) * hexRad * 0.62, Math.sin(iha) * hexRad * 0.62, 0));
  }
  const innerGeo = new THREE.BufferGeometry().setFromPoints(innerHexPts);
  const innerMat = new THREE.LineDashedMaterial({ color: colBlue, transparent: true, opacity: 0.8, dashSize: 0.35, gapSize: 0.22 });
  const innerLine = new THREE.LineLoop(innerGeo, innerMat);
  innerLine.computeLineDistances();
  topLeftGroup.add(innerLine);

  // Satellite radical bonds (CH3, OH, double bonds)
  const radPts = [
    new THREE.Vector3(hexRad, 0, 0), new THREE.Vector3(hexRad + 1.2, 0.5, 0),
    new THREE.Vector3(-hexRad * 0.5, hexRad * 0.866, 0), new THREE.Vector3(-hexRad * 0.5 - 0.9, hexRad * 0.866 + 0.9, 0),
    new THREE.Vector3(-hexRad * 0.5, -hexRad * 0.866, 0), new THREE.Vector3(-hexRad * 0.5 - 0.9, -hexRad * 0.866 - 0.9, 0)
  ];
  topLeftGroup.add(createSegments(radPts, colTerracotta, 0.8));

  // Small connected secondary ring
  const secHexPts = [];
  for (let sh = 0; sh <= 6; sh++) {
    const sha = (sh / 6) * Math.PI * 2;
    secHexPts.push(new THREE.Vector3(3.2 + Math.cos(sha) * 1.1, 0.6 + Math.sin(sha) * 1.1, 0));
  }
  topLeftGroup.add(createThickLine(secHexPts, colSage, 0.7));

  // =========================================================================
  // 2. MID-LEFT FLANK: COMPLETE CHEMISTRY SUITE
  // Proportioned and scaled to fit naturally on the left without touching the center card
  // =========================================================================
  const chemGroup = new THREE.Group();
  chemGroup.position.set(-14.0, -1.8, 0);
  chemGroup.scale.set(0.92, 0.92, 0.92);
  rootGroup.add(chemGroup);

  // Retort Stand
  const standPts = [
    // Heavy base plate
    new THREE.Vector3(-3.8, -7.5, 0), new THREE.Vector3(1.8, -7.5, 0),
    new THREE.Vector3(1.4, -7.1, 0), new THREE.Vector3(-3.4, -7.1, 0),
    new THREE.Vector3(-3.8, -7.5, 0),
    // Vertical Rod
    new THREE.Vector3(-2.4, -7.1, 0), new THREE.Vector3(-2.4, 6.2, 0),
    // Clamping arms
    new THREE.Vector3(-2.4, 3.8, 0), new THREE.Vector3(-0.4, 3.8, 0),
    new THREE.Vector3(-0.4, 4.1, 0), new THREE.Vector3(-0.4, 3.5, 0),
    new THREE.Vector3(-2.4, -2.4, 0), new THREE.Vector3(-0.2, -2.4, 0)
  ];
  chemGroup.add(createThickLine(standPts, colCharcoal, 0.75));

  // Bunsen Burner & Animated Flame
  const burnerPts = [
    new THREE.Vector3(-1.4, -7.1, 0), new THREE.Vector3(0.6, -7.1, 0),
    new THREE.Vector3(0.3, -6.6, 0), new THREE.Vector3(-1.1, -6.6, 0),
    new THREE.Vector3(-1.4, -7.1, 0),
    // Barrel
    new THREE.Vector3(-0.6, -6.6, 0), new THREE.Vector3(-0.6, -4.2, 0),
    new THREE.Vector3(-0.2, -4.2, 0), new THREE.Vector3(-0.2, -6.6, 0),
    // Collar air holes
    new THREE.Vector3(-0.8, -5.8, 0), new THREE.Vector3(0.0, -5.8, 0)
  ];
  chemGroup.add(createThickLine(burnerPts, colSlate, 0.7));

  // Bunsen flame
  const flameCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.4, -4.2, 0),
    new THREE.Vector3(-0.7, -3.3, 0),
    new THREE.Vector3(-0.4, -2.5, 0),
    new THREE.Vector3(-0.1, -3.3, 0),
    new THREE.Vector3(-0.4, -4.2, 0)
  ]);
  const flameLine = createThickLine(flameCurve.getPoints(24), colTerracotta, 0.85);
  chemGroup.add(flameLine);

  // Inner flame cone
  const innerFlamePts = [
    new THREE.Vector3(-0.4, -4.2, 0),
    new THREE.Vector3(-0.6, -3.6, 0),
    new THREE.Vector3(-0.4, -3.0, 0),
    new THREE.Vector3(-0.2, -3.6, 0),
    new THREE.Vector3(-0.4, -4.2, 0)
  ];
  chemGroup.add(createThickLine(innerFlamePts, colBlue, 0.8));

  // Round-bottom Flask
  const flaskGroup = new THREE.Group();
  flaskGroup.position.set(-0.4, -0.6, 0);
  chemGroup.add(flaskGroup);

  const bulbRadius = 1.9;
  const flaskPts = [];
  const cutoffAngle = 0.54;
  for (let a = cutoffAngle; a <= Math.PI * 2 - cutoffAngle; a += 0.08) {
    flaskPts.push(new THREE.Vector3(Math.cos(a) * bulbRadius, Math.sin(a) * bulbRadius, 0));
  }
  const neckTopY = 4.2;
  flaskPts.push(new THREE.Vector3(Math.cos(Math.PI * 2 - cutoffAngle) * bulbRadius, Math.sin(Math.PI * 2 - cutoffAngle) * bulbRadius, 0));
  flaskPts.push(new THREE.Vector3(0.5, neckTopY, 0));
  flaskPts.push(new THREE.Vector3(0.7, neckTopY, 0));
  flaskPts.push(new THREE.Vector3(-0.7, neckTopY, 0));
  flaskPts.push(new THREE.Vector3(-0.5, neckTopY, 0));
  flaskPts.push(new THREE.Vector3(Math.cos(cutoffAngle) * bulbRadius, Math.sin(cutoffAngle) * bulbRadius, 0));
  flaskGroup.add(createThickLine(flaskPts, colBlue, 0.85));

  // Meniscus
  const meniscusCurve = [];
  for (let m = 0; m <= 30; m++) {
    const mu = (m / 30) * 2 - 1;
    meniscusCurve.push(new THREE.Vector3(mu * 1.6, -0.2 + Math.sin(mu * Math.PI) * 0.15, 0));
  }
  flaskGroup.add(createThickLine(meniscusCurve, colTerracotta, 0.9));

  // Volumetric measurement ticks
  const tickSegments = [];
  for (let t = -3; t <= 3; t++) {
    const ty = t * 0.38;
    tickSegments.push(new THREE.Vector3(-1.4, ty, 0), new THREE.Vector3(-0.95, ty, 0));
    tickSegments.push(new THREE.Vector3(0.95, ty, 0), new THREE.Vector3(1.4, ty, 0));
  }
  flaskGroup.add(createSegments(tickSegments, colSage, 0.7));

  // Bubbles
  const bubbles: any[] = [];
  for (let b = 0; b < 12; b++) {
    const bPts = [];
    for (let ba = 0; ba <= 14; ba++) {
      const th = (ba / 14) * Math.PI * 2;
      bPts.push(new THREE.Vector3(Math.cos(th) * 0.09, Math.sin(th) * 0.09, 0));
    }
    const bLine = createThickLine(bPts, colTerracotta, 0.75, true);
    bLine.position.set((Math.random() - 0.5) * 1.8, -1.6 + Math.random() * 1.4, 0);
    flaskGroup.add(bLine);
    bubbles.push({ mesh: bLine, speed: 0.015 + Math.random() * 0.018, initY: -1.6, maxY: -0.1, baseX: bLine.position.x });
  }

  // Helical Condenser Coil
  const coilPts = [];
  for (let c = 0; c <= 60; c++) {
    const ct = (c / 60) * Math.PI * 8;
    const cy = 4.2 + (c / 60) * 3.4;
    const cx = Math.sin(ct) * 0.4;
    const cz = Math.cos(ct) * 0.4;
    coilPts.push(new THREE.Vector3(cx, cy, cz));
  }
  chemGroup.add(createThickLine(coilPts, colSage, 0.8));

  // 3 Test Tubes on left stand rack
  const testTubes = [-4.6, -3.7, -2.8];
  testTubes.forEach((tx: number, idx: number) => {
    const tubePts = [
      new THREE.Vector3(tx - 0.25, -4.6, 0),
      new THREE.Vector3(tx - 0.25, -6.8, 0),
      new THREE.Vector3(tx - 0.18, -7.1, 0),
      new THREE.Vector3(tx + 0.18, -7.1, 0),
      new THREE.Vector3(tx + 0.25, -6.8, 0),
      new THREE.Vector3(tx + 0.25, -4.6, 0)
    ];
    chemGroup.add(createThickLine(tubePts, colCharcoal, 0.7));
    const fY = -6.3 + idx * 0.6;
    const fPts = [new THREE.Vector3(tx - 0.23, fY, 0), new THREE.Vector3(tx + 0.23, fY, 0)];
    chemGroup.add(createThickLine(fPts, idx === 0 ? colBlue : (idx === 1 ? colSage : colTerracotta), 0.85));
  });

  // =========================================================================
  // 3. TOP-RIGHT: KINETIC PLANETARY GEARS & MECHANICAL TRANSMISSION
  // Open and spacious in the top-right corner, cleanly separated from the microscope
  // =========================================================================
  const mechanicsGroup = new THREE.Group();
  mechanicsGroup.position.set(13.8, 8.2, 0);
  rootGroup.add(mechanicsGroup);

  function buildGear(radius: number, teeth: number, color: any, opacity: number): any {
    const holder = new THREE.Group();
    const pts = [];
    const step = (Math.PI * 2) / (teeth * 2);
    for (let i = 0; i < teeth * 2; i++) {
      const ang = i * step;
      const r = (i % 2 === 0) ? radius : radius * 0.86;
      pts.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, 0));
    }
    pts.push(pts[0].clone());
    holder.add(createThickLine(pts, color, opacity));

    const spokeSegments = [];
    for (let s = 0; s < 4; s++) {
      const sa = (s / 4) * Math.PI;
      spokeSegments.push(
        new THREE.Vector3(Math.cos(sa) * radius * 0.75, Math.sin(sa) * radius * 0.75, 0),
        new THREE.Vector3(-Math.cos(sa) * radius * 0.75, -Math.sin(sa) * radius * 0.75, 0)
      );
    }
    holder.add(createSegments(spokeSegments, color, opacity * 0.8));

    const hubPts = [];
    for (let h = 0; h <= 20; h++) {
      const ha = (h / 20) * Math.PI * 2;
      hubPts.push(new THREE.Vector3(Math.cos(ha) * radius * 0.25, Math.sin(ha) * radius * 0.25, 0));
    }
    holder.add(createThickLine(hubPts, color, opacity, true));
    return holder;
  }

  const gearA = buildGear(1.8, 12, colSage, 0.8);
  gearA.position.set(-1.8, 0, 0);
  mechanicsGroup.add(gearA);

  const gearB = buildGear(1.2, 8, colTerracotta, 0.85);
  gearB.position.set(1.2, 0.8, 0);
  mechanicsGroup.add(gearB);

  // Linkage bar
  const linkagePts = [new THREE.Vector3(-1.8, 0, 0.05), new THREE.Vector3(1.2, 0.8, 0.05)];
  mechanicsGroup.add(createThickLine(linkagePts, colBlue, 0.8));

  // =========================================================================
  // 4. MID-RIGHT FLANK: SCIENTIFIC MICROSCOPE & RUTHERFORD-BOHR ATOM
  // Arranged cleanly with plenty of margin, no overlap between atom and scope
  // =========================================================================
  const rightWing = new THREE.Group();
  rightWing.position.set(14.2, -1.2, 0);
  rootGroup.add(rightWing);

  // --- A. Rutherford-Bohr Atom (Positioned in upper area of right flank) ---
  const atomGroup = new THREE.Group();
  atomGroup.position.set(0.5, 3.8, 0);
  rightWing.add(atomGroup);

  // Terracotta Nucleus
  const nucleusPts = [];
  for (let n = 0; n < 8; n++) {
    const na = (n / 8) * Math.PI * 2;
    nucleusPts.push(new THREE.Vector3(Math.cos(na) * 0.38, Math.sin(na) * 0.38, 0));
  }
  atomGroup.add(createThickLine(nucleusPts, colTerracotta, 0.9, true));

  // 3 Distinct Elliptical Orbits
  const orbits: any[] = [];
  const orbSpecs = [
    { rx: 3.4, ry: 1.3, rotZ: 0.45, rotY: 0.6, speed: 0.9, color: colBlue },
    { rx: 3.2, ry: 1.4, rotZ: -0.85, rotY: -0.5, speed: -0.75, color: colSage },
    { rx: 3.6, ry: 1.2, rotZ: 1.4, rotY: 0.35, speed: 1.1, color: colTerracotta }
  ];

  orbSpecs.forEach((spec: any) => {
    const oHolder = new THREE.Group();
    oHolder.rotation.z = spec.rotZ;
    oHolder.rotation.y = spec.rotY;

    const orbCurve = new THREE.EllipseCurve(0, 0, spec.rx, spec.ry, 0, Math.PI * 2, false, 0);
    oHolder.add(createThickLine(orbCurve.getPoints(64), spec.color, 0.75, true));

    const ePt = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]),
      new THREE.PointsMaterial({ color: spec.color, size: 0.65, transparent: true, opacity: 0.95 })
    );
    oHolder.add(ePt);
    atomGroup.add(oHolder);
    orbits.push({ oHolder, spec, ePt });
  });

  // --- B. Scientific Optical Microscope (Positioned lower on right flank) ---
  const microGroup = new THREE.Group();
  microGroup.position.set(0.2, -4.2, 0);
  microGroup.scale.set(0.88, 0.88, 0.88);
  rightWing.add(microGroup);

  const scopeOutline = [
    // Horseshoe Base
    new THREE.Vector3(-2.4, -4.5, 0), new THREE.Vector3(2.8, -4.5, 0),
    new THREE.Vector3(2.4, -3.8, 0), new THREE.Vector3(-2.0, -3.8, 0),
    new THREE.Vector3(-2.4, -4.5, 0),
    // Upright limb
    new THREE.Vector3(2.0, -3.8, 0),
    new THREE.Vector3(2.3, 0.2, 0),
    new THREE.Vector3(1.8, 3.2, 0),
    new THREE.Vector3(0.5, 4.2, 0),
    // Angled body tube
    new THREE.Vector3(-0.5, 5.4, 0),
    new THREE.Vector3(-1.4, 4.5, 0),
    new THREE.Vector3(-0.3, 3.2, 0),
    new THREE.Vector3(0.5, 4.2, 0)
  ];
  microGroup.add(createThickLine(scopeOutline, colCharcoal, 0.8));

  // Eyepiece lens tube
  const eyepiecePts = [
    new THREE.Vector3(-1.4, 4.5, 0), new THREE.Vector3(-2.1, 5.2, 0),
    new THREE.Vector3(-1.6, 5.7, 0), new THREE.Vector3(-0.5, 5.4, 0)
  ];
  microGroup.add(createThickLine(eyepiecePts, colCharcoal, 0.8));

  // Stage & Objectives
  const stagePts = [
    new THREE.Vector3(-1.8, -0.6, 0), new THREE.Vector3(1.4, -0.6, 0),
    new THREE.Vector3(-1.1, -0.45, 0), new THREE.Vector3(0.7, -0.45, 0), // glass slide
    new THREE.Vector3(-0.2, 1.2, 0), new THREE.Vector3(-0.2, -0.2, 0),   // objective 1
    new THREE.Vector3(0.3, 1.3, 0), new THREE.Vector3(0.5, 0.1, 0)      // objective 2
  ];
  microGroup.add(createSegments(stagePts, colBlue, 0.8));

  // Focus adjustment knobs
  const knobPts = [];
  for (let k = 0; k <= 20; k++) {
    const ka = (k / 20) * Math.PI * 2;
    knobPts.push(new THREE.Vector3(2.1 + Math.cos(ka) * 0.55, 1.2 + Math.sin(ka) * 0.55, 0));
  }
  microGroup.add(createThickLine(knobPts, colTerracotta, 0.85, true));

  // Focal light beam
  const beamPts = [
    new THREE.Vector3(-0.2, -3.2, 0), new THREE.Vector3(-0.2, -0.45, 0),
    new THREE.Vector3(-0.5, -3.2, 0), new THREE.Vector3(-0.2, -0.45, 0),
    new THREE.Vector3(0.1, -3.2, 0), new THREE.Vector3(-0.2, -0.45, 0)
  ];
  const beamGeo = new THREE.BufferGeometry().setFromPoints(beamPts);
  const beamMat = new THREE.LineDashedMaterial({ color: colGold, transparent: true, opacity: 0.85, dashSize: 0.35, gapSize: 0.25 });
  const beamLine = new THREE.LineSegments(beamGeo, beamMat);
  beamLine.computeLineDistances();
  microGroup.add(beamLine);

  // =========================================================================
  // 5. BOTTOM TIER: FULL-WIDTH LOGISTICS EXPEDITION ROUTE & HARMONIC WAVE SPECTRUM
  // Anchored well below the login card (yBase: -10.5 to -12.5) with zero overlap
  // =========================================================================
  const bottomTier = new THREE.Group();
  rootGroup.add(bottomTier);

  const wavePointsCount = 260;
  const waveCurves: any[] = [];
  const waveConfigs = [
    { color: colBlue, opacity: 0.55, speed: 0.65, freq: 0.11, amp: 0.95, phase: 0, yBase: -10.2 },
    { color: colSage, opacity: 0.5, speed: 0.85, freq: 0.18, amp: 0.75, phase: 2.1, yBase: -11.2 },
    { color: colTerracotta, opacity: 0.45, speed: 0.5, freq: 0.07, amp: 1.1, phase: 4.2, yBase: -12.2 }
  ];

  waveConfigs.forEach((cfg: any) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(wavePointsCount * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: cfg.opacity,
      linewidth: 2
    }));
    bottomTier.add(line);
    waveCurves.push({ line, ...cfg });
  });

  // Mobile Lab Field Deployment Spline
  const routeGroup = new THREE.Group();
  bottomTier.add(routeGroup);

  const waypoints = [
    new THREE.Vector3(-24, -10.8, 0),
    new THREE.Vector3(-15, -9.8, 0.5),
    new THREE.Vector3(-6, -11.2, -0.5),
    new THREE.Vector3(4, -10.0, 0.5),
    new THREE.Vector3(14, -11.0, -0.5),
    new THREE.Vector3(24, -9.6, 0)
  ];
  const routeSpline = new THREE.CatmullRomCurve3(waypoints);
  const splinePts = routeSpline.getPoints(240);
  const splineGeo = new THREE.BufferGeometry().setFromPoints(splinePts);
  const splineMat = new THREE.LineDashedMaterial({
    color: colBlue,
    transparent: true,
    opacity: 0.7,
    dashSize: 0.6,
    gapSize: 0.4,
    linewidth: 2
  });
  const splineLine = new THREE.Line(splineGeo, splineMat);
  splineLine.computeLineDistances();
  routeGroup.add(splineLine);

  // Waypoint indicator rings & radar ripples along route
  const waypointNodes: any[] = [];
  waypoints.forEach((pt: any, idx: number) => {
    const holder = new THREE.Group();
    holder.position.copy(pt);

    const circlePts = [];
    for (let a = 0; a <= 24; a++) {
      const th = (a / 24) * Math.PI * 2;
      circlePts.push(new THREE.Vector3(Math.cos(th) * 0.35, Math.sin(th) * 0.35, 0));
    }
    const dotLine = createThickLine(circlePts, idx % 2 === 0 ? colTerracotta : colBlue, 0.8, true);
    holder.add(dotLine);

    const ripLine = createThickLine(circlePts, colSage, 0.65, true);
    holder.add(ripLine);

    routeGroup.add(holder);
    waypointNodes.push({ holder, rip: ripLine, phase: idx * 1.3 });
  });

  // Mobile Lab Rover Tracker Node
  const roverNode = new THREE.Group();
  const roverPts = [];
  for (let a = 0; a <= 24; a++) {
    const th = (a / 24) * Math.PI * 2;
    roverPts.push(new THREE.Vector3(Math.cos(th) * 0.48, Math.sin(th) * 0.48, 0));
  }
  roverNode.add(createThickLine(roverPts, colTerracotta, 0.95, true));
  roverNode.add(createSegments([
    new THREE.Vector3(-0.35, 0, 0), new THREE.Vector3(0.35, 0, 0),
    new THREE.Vector3(0, -0.35, 0), new THREE.Vector3(0, 0.35, 0)
  ], colTerracotta, 0.9));
  routeGroup.add(roverNode);

  // =========================================================================
  // 6. AMBIENT PARTICLES (Distributed evenly in outer peripheral space)
  // =========================================================================
  const pCount = 50;
  const pPos = new Float32Array(pCount * 3);
  const pVels: any[] = [];
  for (let p = 0; p < pCount; p++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const px = side * (8.5 + Math.random() * 14);
    const py = (Math.random() - 0.5) * 22;
    pPos[p * 3] = px;
    pPos[p * 3 + 1] = py;
    pPos[p * 3 + 2] = (Math.random() - 0.5) * 6;
    pVels.push({ vx: (Math.random() - 0.5) * 0.005, vy: (Math.random() - 0.5) * 0.005, side });
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pSystem = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: colCharcoal,
    size: 0.28,
    transparent: true,
    opacity: 0.5
  }));
  rootGroup.add(pSystem);

  // =========================================================================

      /* --- INTERACTIVITY & ANIMATION --- */
      let mouseX = 0, mouseY = 0;
      let targetMouseX = 0, targetMouseY = 0;

      onMouseMove = (e: MouseEvent) => {
        targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
        targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      };

      onResize = () => {
        if (!container || !renderer) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("resize", onResize);

      let time = 0;
      function animate() {
        if (disposed) return;
        animId = requestAnimationFrame(animate);
    time += 0.014;

    mouseX += (targetMouseX - mouseX) * 0.03;
    mouseY += (targetMouseY - mouseY) * 0.03;

    // Gentle parallax across the entire blueprint landscape
    rootGroup.rotation.y = mouseX * 0.05 + Math.sin(time * 0.15) * 0.01;
    rootGroup.rotation.x = -mouseY * 0.04;

    // Bunsen flame flicker
    const flameScale = 1.0 + Math.sin(time * 8.0) * 0.05;
    flameLine.scale.set(1.0 + Math.sin(time * 12.0) * 0.04, flameScale, 1.0);

    // Chemical bubbles ascending
    bubbles.forEach((b: any) => {
      b.mesh.position.y += b.speed;
      b.mesh.position.x = b.baseX + Math.sin(time * 2.2 + b.mesh.position.y * 3) * 0.05;
      if (b.mesh.position.y > b.maxY) {
        b.mesh.position.y = b.initY;
      }
    });

    // Benzene slow turn
    topLeftGroup.rotation.z = time * 0.08;

    // Optical microscope focal beam dashed rhythm
    beamMat.dashOffset = -time * 0.4;

    // Atomic orbitals & electron kinematics
    orbits.forEach((orb: any) => {
      const curAng = time * orb.spec.speed;
      orb.ePt.position.set(Math.cos(curAng) * orb.spec.rx, Math.sin(curAng) * orb.spec.ry, 0);
    });
    atomGroup.rotation.z = Math.sin(time * 0.18) * 0.12;

    // Mechanical gear rotation with matching mesh gear ratios
    gearA.rotation.z = -time * 0.25;
    gearB.rotation.z = time * (0.25 * (1.8 / 1.2));

    // Bottom wave function oscillation
    waveCurves.forEach((wc: any) => {
      const posArr = wc.line.geometry.attributes.position.array;
      for (let i = 0; i < wavePointsCount; i++) {
        const u = i / (wavePointsCount - 1);
        const x = -26 + u * 52;
        const y = wc.yBase + Math.sin(u * 14 * wc.freq + time * wc.speed + wc.phase + mouseX * 0.5) * wc.amp
                           + Math.cos(u * 6 + time * 0.4) * 0.25;
        posArr[i * 3] = x;
        posArr[i * 3 + 1] = y;
        posArr[i * 3 + 2] = Math.sin(u * 4 + time * 0.3) * 0.4;
      }
      wc.line.geometry.attributes.position.needsUpdate = true;
    });

    // Mobile Lab Logistics Rover travel along route
    const roverT = (time * 0.03) % 1.0;
    const rPos = routeSpline.getPointAt(roverT);
    roverNode.position.copy(rPos);
    roverNode.rotation.z += 0.02;

    waypointNodes.forEach((wn: any) => {
      const ripScale = 1.0 + ((time * 0.85 + wn.phase) % 2.0) * 0.8;
      wn.rip.scale.set(ripScale, ripScale, 1);
      wn.rip.material.opacity = Math.max(0, 0.65 * (1 - (ripScale - 1) / 1.6));
    });

    // Ambient particles drift
    const pArr = pSystem.geometry.attributes.position.array;
    for (let p = 0; p < pCount; p++) {
      pArr[p * 3] += pVels[p].vx;
      pArr[p * 3 + 1] += pVels[p].vy;
      if (Math.abs(pArr[p * 3]) < 7.5) {
        pArr[p * 3] = pVels[p].side * 8.5;
      }
      if (pArr[p * 3] > 24) pArr[p * 3] = 8.5;
      if (pArr[p * 3] < -24) pArr[p * 3] = -8.5;
      if (pArr[p * 3 + 1] > 12) pArr[p * 3 + 1] = -12;
      if (pArr[p * 3 + 1] < -12) pArr[p * 3 + 1] = 12;
    }
    pSystem.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

      animate();
    };

    if (typeof (window as any).THREE !== "undefined") {
      initScene();
    } else {
      const existingScript = document.querySelector('script[src*="three"][src*="r125"]') as HTMLScriptElement;
      if (existingScript) {
        existingScript.addEventListener("load", initScene);
      } else {
        const script = document.createElement("script");
        script.src = "https://ajax.googleapis.com/ajax/libs/threejs/r125/three.min.js";
        script.async = true;
        script.onload = initScene;
        document.head.appendChild(script);
      }
    }

    return () => {
      disposed = true;
      if (animId) cancelAnimationFrame(animId);
      if (onMouseMove) window.removeEventListener("mousemove", onMouseMove);
      if (onResize) window.removeEventListener("resize", onResize);
      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="interactive-science-blueprint absolute inset-0 w-full h-full bg-transparent overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
}
