'use client';

import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Hotspot } from '@/types/database';
import { Compass, Navigation } from 'lucide-react';

interface HotspotMarkerProps {
  hotspot: Hotspot;
  onSelect: (hotspot: Hotspot) => void;
  isSelected?: boolean;
}

export function HotspotMarker({ hotspot, onSelect, isSelected }: HotspotMarkerProps) {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const [distance, setDistance] = useState<number>(0);
  const [hovered, setHovered] = useState(false);

  const position = new THREE.Vector3(hotspot.pos_x, hotspot.pos_y, hotspot.pos_z);

  useFrame(() => {
    if (meshRef.current) {
      // Subtle floating rotation & pulsing scale animation
      meshRef.current.rotation.y += 0.015;
      const dist = camera.position.distanceTo(position);
      setDistance(Math.round(dist * 10) / 10);
    }
  });

  return (
    <group position={[hotspot.pos_x, hotspot.pos_y, hotspot.pos_z]}>
      {/* Outer Glowing Mesh */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(hotspot);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered || isSelected ? [1.2, 1.2, 1.2] : [1, 1, 1]}
      >
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : hovered ? '#0284c7' : '#0ea5e9'}
          emissive={isSelected ? '#38bdf8' : '#0284c7'}
          emissiveIntensity={hovered || isSelected ? 0.9 : 0.4}
          roughness={0.2}
        />
      </mesh>

      {/* Outer Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.35, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          side={THREE.DoubleSide}
          transparent
          opacity={hovered || isSelected ? 0.8 : 0.4}
        />
      </mesh>

      {/* HTML Spatial Badge Overlay */}
      <Html
        position={[0, 0.4, 0]}
        center
        distanceFactor={10}
        zIndexRange={[100, 0]}
      >
        <div
          onClick={() => onSelect(hotspot)}
          className={`group relative flex items-center gap-2 cursor-pointer transition-all duration-300 transform select-none ${
            hovered || isSelected ? 'scale-105 z-20' : 'scale-95 opacity-90'
          }`}
        >
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-lg transition-all ${
              isSelected
                ? 'bg-sky-500/90 text-white border-sky-300 ring-2 ring-sky-400/50'
                : hovered
                ? 'bg-slate-900/90 text-sky-400 border-sky-500/50'
                : 'bg-slate-950/80 text-slate-200 border-slate-700/60 hover:border-sky-500'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="text-xs font-semibold whitespace-nowrap tracking-wide">
              {hotspot.name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded-full border border-slate-700">
              {distance}m
            </span>
          </div>

          {/* Hover details tooltips */}
          {hovered && hotspot.description && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2.5 rounded-lg bg-slate-950/95 border border-sky-500/30 text-[11px] text-slate-300 shadow-2xl backdrop-blur-md pointer-events-none">
              <div className="font-semibold text-sky-400 mb-1 flex items-center gap-1">
                <Compass className="w-3 h-3" /> Tour Point
              </div>
              {hotspot.description}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
