"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";
import type { TravelPlace } from "@/lib/travel-shared";

interface TravelGlobeProps {
  places: TravelPlace[];
  onPinClick: (place: TravelPlace) => void;
  highlightedId?: string | null;
}

const GLOBE_RADIUS = 2;
const STAR_COUNT = 1500;

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function createStars(): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const verts: number[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 40 + Math.random() * 60;
    verts.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    );
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, sizeAttenuation: true });
  return new THREE.Points(geo, mat);
}

function createGridLines(r: number): THREE.LineSegments {
  const points: number[] = [];
  const segments = 64;

  for (let lat = -60; lat <= 60; lat += 30) {
    for (let i = 0; i <= segments; i++) {
      const lng = (i / segments) * 360 - 180;
      const v = latLngToVec3(lat, lng, r + 0.003);
      points.push(v.x, v.y, v.z);
    }
  }
  for (let lng = -180; lng < 180; lng += 30) {
    for (let i = 0; i <= segments; i++) {
      const lat = (i / segments) * 180 - 90;
      const v = latLngToVec3(lat, lng, r + 0.003);
      points.push(v.x, v.y, v.z);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x2a4a6a, transparent: true, opacity: 0.15 });
  return new THREE.LineSegments(geo, mat);
}

function createCountryLines(r: number): THREE.Group {
  const group = new THREE.Group();
  const topo = worldData as unknown as Topology<{ countries: GeometryCollection }>;
  const countries = feature(topo, topo.objects.countries);

  const lineMat = new THREE.LineBasicMaterial({
    color: 0x4a9eca,
    transparent: true,
    opacity: 0.55,
  });

  countries.features.forEach((f) => {
    const geom = f.geometry;
    if (!geom) return;

    const processRing = (ring: number[][]) => {
      if (ring.length < 2) return;
      const pts = ring.map(([lng, lat]) => latLngToVec3(lat, lng, r + 0.006));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      group.add(new THREE.Line(geo, lineMat));
    };

    if (geom.type === "Polygon") {
      (geom.coordinates as number[][][]).forEach(processRing);
    } else if (geom.type === "MultiPolygon") {
      (geom.coordinates as number[][][][]).forEach((poly) =>
        poly.forEach(processRing),
      );
    }
  });

  return group;
}

export default function TravelGlobe({ places, onPinClick, highlightedId }: TravelGlobeProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    globe: THREE.Group;
    pinGroup: THREE.Group;
    animId: number;
    isDragging: boolean;
    hasDragged: boolean;
    lastMouse: { x: number; y: number };
    lastTouch: { x: number; y: number } | null;
    lastPinchDist: number | null;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    autoRotate: boolean;
    autoRotateTimer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const placesRef = useRef(places);
  const onPinClickRef = useRef(onPinClick);
  useEffect(() => { placesRef.current = places; }, [places]);
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);

  const buildPins = useCallback((pinGroup: THREE.Group, currentPlaces: TravelPlace[], highlighted: string | null) => {
    while (pinGroup.children.length > 0) {
      const child = pinGroup.children[0] as THREE.Mesh;
      child.geometry?.dispose();
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else (child.material as THREE.Material)?.dispose();
      pinGroup.remove(child);
    }

    currentPlaces.forEach((place) => {
      const pos = latLngToVec3(place.lat, place.lng, GLOBE_RADIUS);
      const isHighlighted = highlighted === place.id;

      const sphereGeo = new THREE.SphereGeometry(0.045, 12, 12);
      const sphereMat = new THREE.MeshPhongMaterial({
        color: isHighlighted ? 0xffd700 : 0x10b981,
        emissive: isHighlighted ? 0xff8800 : 0x065f46,
        shininess: 80,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(pos);
      sphere.userData = { placeId: place.id };

      const coneGeo = new THREE.ConeGeometry(0.022, 0.12, 8);
      const coneMat = new THREE.MeshPhongMaterial({
        color: isHighlighted ? 0xffd700 : 0x10b981,
        emissive: isHighlighted ? 0xff4400 : 0x064e3b,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      const dir = pos.clone().normalize();
      cone.position.copy(pos.clone().addScaledVector(dir, -0.07));
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
      cone.userData = { placeId: place.id };

      pinGroup.add(sphere);
      pinGroup.add(cone);
    });
  }, []);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const w = container.clientWidth || 500;
    const h = container.clientHeight || 500;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x080c18, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    camera.position.set(0, 0, 5.5);

    const ambientLight = new THREE.AmbientLight(0x334466, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.4);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    const stars = createStars();
    scene.add(stars);

    const globe = new THREE.Group();
    scene.add(globe);

    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0x0d2137,
      specular: 0x2266aa,
      shininess: 60,
      emissive: 0x051020,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globe.add(globeMesh);

    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 0.06, 32, 32);
    const atmosMat = new THREE.MeshPhongMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.08,
      side: THREE.FrontSide,
    });
    globe.add(new THREE.Mesh(atmosGeo, atmosMat));

    globe.add(createGridLines(GLOBE_RADIUS));
    globe.add(createCountryLines(GLOBE_RADIUS));

    const pinGroup = new THREE.Group();
    globe.add(pinGroup);
    buildPins(pinGroup, places, highlightedId ?? null);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.05 };
    const mouse = new THREE.Vector2();

    const state = {
      renderer, scene, camera, globe, pinGroup,
      animId: 0,
      isDragging: false,
      hasDragged: false,
      lastMouse: { x: 0, y: 0 },
      lastTouch: null as { x: number; y: number } | null,
      lastPinchDist: null as number | null,
      raycaster, mouse,
      autoRotate: true,
      autoRotateTimer: null as ReturnType<typeof setTimeout> | null,
    };
    sceneRef.current = state;

    function animate() {
      state.animId = requestAnimationFrame(animate);
      if (state.autoRotate && !state.isDragging) {
        globe.rotation.y += 0.0015;
      }
      renderer.render(scene, camera);
    }
    animate();

    function resumeAutoRotate() {
      if (state.autoRotateTimer) clearTimeout(state.autoRotateTimer);
      state.autoRotateTimer = setTimeout(() => { state.autoRotate = true; }, 3000);
    }

    function onMouseDown(e: MouseEvent) {
      state.isDragging = true;
      state.hasDragged = false;
      state.autoRotate = false;
      state.lastMouse = { x: e.clientX, y: e.clientY };
    }
    function onMouseMove(e: MouseEvent) {
      if (!state.isDragging) return;
      const dx = e.clientX - state.lastMouse.x;
      const dy = e.clientY - state.lastMouse.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) state.hasDragged = true;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x += dy * 0.005;
      globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
      state.lastMouse = { x: e.clientX, y: e.clientY };
    }
    function onMouseUp() {
      state.isDragging = false;
      resumeAutoRotate();
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.004;
      camera.position.z = Math.max(2.8, Math.min(9, camera.position.z));
      state.autoRotate = false;
      resumeAutoRotate();
    }
    function onClick(e: MouseEvent) {
      if (state.hasDragged) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pinGroup.children, false);
      if (hits.length > 0) {
        const placeId = hits[0].object.userData.placeId as string;
        const found = placesRef.current.find((p) => p.id === placeId);
        if (found) onPinClickRef.current(found);
      }
    }

    function onTouchStart(e: TouchEvent) {
      state.autoRotate = false;
      if (e.touches.length === 1) {
        state.isDragging = true;
        state.hasDragged = false;
        state.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        state.lastPinchDist = null;
      } else if (e.touches.length === 2) {
        state.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        state.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 1 && state.isDragging && state.lastTouch) {
        const dx = e.touches[0].clientX - state.lastTouch.x;
        const dy = e.touches[0].clientY - state.lastTouch.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) state.hasDragged = true;
        globe.rotation.y += dx * 0.005;
        globe.rotation.x += dy * 0.005;
        globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
        state.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && state.lastPinchDist !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        camera.position.z -= (dist - state.lastPinchDist) * 0.02;
        camera.position.z = Math.max(2.8, Math.min(9, camera.position.z));
        state.lastPinchDist = dist;
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length === 0) {
        if (!state.hasDragged && state.lastTouch) {
          const rect = renderer.domElement.getBoundingClientRect();
          const touch = e.changedTouches[0];
          mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);
          const hits = raycaster.intersectObjects(pinGroup.children, false);
          if (hits.length > 0) {
            const placeId = hits[0].object.userData.placeId as string;
            const found = placesRef.current.find((p) => p.id === placeId);
            if (found) onPinClickRef.current(found);
          }
        }
        state.isDragging = false;
        state.lastTouch = null;
        state.lastPinchDist = null;
        resumeAutoRotate();
      }
    }

    const el = renderer.domElement;
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("click", onClick);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    function onResize() {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    }
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(state.animId);
      if (state.autoRotateTimer) clearTimeout(state.autoRotateTimer);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("click", onClick);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(el)) container.removeChild(el);
      sceneRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    buildPins(s.pinGroup, places, highlightedId ?? null);
  }, [places, highlightedId, buildPins]);

  return (
    <div
      ref={canvasRef}
      style={{ width: "100%", height: "100%", minHeight: 320, cursor: "grab", userSelect: "none" }}
    />
  );
}
