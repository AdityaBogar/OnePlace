'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

interface BuildingModelProps {
  url?: string;
  onLoaded?: () => void;
}

class GlbErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error('Error loading custom GLB 3D model:', error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function BuildingModel({ url, onLoaded }: BuildingModelProps) {
  const isCustomGlb = Boolean(
    url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:'))
  );

  return (
    <group name="building-structure">
      {isCustomGlb && url ? (
        <GlbErrorBoundary fallback={<ProceduralLuxuryVilla onLoaded={onLoaded} />}>
          <CustomGlbModel url={url} onLoaded={onLoaded} />
        </GlbErrorBoundary>
      ) : (
        <ProceduralLuxuryVilla onLoaded={onLoaded} />
      )}
    </group>
  );
}

function CustomGlbModel({ url, onLoaded }: { url: string; onLoaded?: () => void }) {
  const { scene } = useGLTF(url);

  useMemo(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    if (onLoaded) onLoaded();
  }, [scene, onLoaded]);

  return <primitive object={scene} scale={[1, 1, 1]} position={[0, 0, 0]} />;
}

/**
 * High-detail, luxury 3D Villa with ground floor, upper floor, floating staircases,
 * balconies, glass walls, living area, kitchen island, and infinity pool deck.
 * Designed with precise mesh bounds for physical collision!
 */
export function ProceduralLuxuryVilla({ onLoaded }: { onLoaded?: () => void }) {
  React.useEffect(() => {
    if (onLoaded) onLoaded();
  }, [onLoaded]);

  return (
    <group name="luxury-villa">
      {/* GROUND & LANDSCAPING */}
      {/* Main Plot Floor */}
      <mesh position={[0, -0.05, 0]} receiveShadow name="floor-ground">
        <boxGeometry args={[40, 0.1, 40]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* Lawn / Garden */}
      <mesh position={[0, -0.02, 12]} receiveShadow name="lawn">
        <boxGeometry args={[36, 0.05, 12]} />
        <meshStandardMaterial color="#14532d" roughness={0.9} />
      </mesh>

      {/* Pool Basin & Teak Deck */}
      <mesh position={[0, 0.01, -12]} receiveShadow name="pool-deck">
        <boxGeometry args={[24, 0.1, 10]} />
        <meshStandardMaterial color="#451a03" roughness={0.4} />
      </mesh>

      {/* Water Surface */}
      <mesh position={[0, 0.05, -12]}>
        <boxGeometry args={[18, 0.05, 6]} />
        <meshPhysicalMaterial 
          color="#0284c7" 
          transmission={0.85} 
          opacity={1} 
          transparent 
          roughness={0.1} 
          ior={1.33} 
        />
      </mesh>

      {/* ================= VILLA STRUCTURE ================= */}
      {/* Ground Floor Slab */}
      <mesh position={[0, 0.1, 0]} receiveShadow name="floor-ground-slab">
        <boxGeometry args={[20, 0.2, 16]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Upper Floor Slab */}
      <mesh position={[0, 3.5, 0]} receiveShadow name="floor-upper-slab">
        <boxGeometry args={[20, 0.25, 16]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
      </mesh>

      {/* Roof Canopy */}
      <mesh position={[0, 6.8, 0]} castShadow receiveShadow name="roof-canopy">
        <boxGeometry args={[22, 0.3, 18]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>

      {/* ================= WALLS (COLLISION MESHES) ================= */}
      {/* Back Wall (Z = -8) */}
      <mesh position={[0, 3.4, -8]} castShadow receiveShadow name="wall-back">
        <boxGeometry args={[20, 6.8, 0.3]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>

      {/* Left Outer Wall (X = -10) */}
      <mesh position={[-10, 3.4, 0]} castShadow receiveShadow name="wall-left">
        <boxGeometry args={[0.3, 6.8, 16]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
      </mesh>

      {/* Right Outer Wall (X = 10) */}
      <mesh position={[10, 3.4, 0]} castShadow receiveShadow name="wall-right">
        <boxGeometry args={[0.3, 6.8, 16]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
      </mesh>

      {/* Ground Floor Interior Partition (Living/Kitchen Divider) */}
      <mesh position={[2, 1.75, 0]} castShadow receiveShadow name="wall-partition">
        <boxGeometry args={[0.2, 3.3, 10]} />
        <meshStandardMaterial color="#64748b" roughness={0.4} />
      </mesh>

      {/* Front Entrance Glass Facade */}
      <mesh position={[-4, 1.75, 8]}>
        <boxGeometry args={[11.8, 3.3, 0.1]} />
        <meshPhysicalMaterial color="#bae6fd" transmission={0.9} transparent opacity={0.4} roughness={0.05} />
      </mesh>

      {/* Doorway Passage Opening (Entrance) */}
      <mesh position={[4, 1.75, 8]} castShadow receiveShadow name="wall-front-door">
        <boxGeometry args={[4, 3.3, 0.3]} />
        <meshStandardMaterial color="#334155" roughness={0.3} />
      </mesh>

      {/* ================= STAIRCASE (STEPPED MESH FOR ASCENDING/DESCENDING) ================= */}
      <group position={[1.5, 0.2, 2]} name="staircase">
        {Array.from({ length: 14 }).map((_, i) => {
          const stepHeight = 0.23;
          const stepDepth = 0.35;
          const y = i * stepHeight + 0.11;
          const z = 3 - i * stepDepth;
          return (
            <mesh key={i} position={[0, y, z]} castShadow receiveShadow name={`stair-step-${i}`}>
              <boxGeometry args={[2.2, stepHeight, stepDepth]} />
              <meshStandardMaterial color="#b45309" roughness={0.3} />
            </mesh>
          );
        })}
      </group>

      {/* Upper Floor Balcony Railing */}
      <mesh position={[-4, 4.1, 8]}>
        <boxGeometry args={[12, 1.0, 0.08]} />
        <meshPhysicalMaterial color="#e0f2fe" transmission={0.95} transparent opacity={0.5} />
      </mesh>

      {/* ================= INTERIOR FURNISHINGS ================= */}
      {/* Great Salon Fireplace & TV Wall */}
      <mesh position={[-6, 1.75, -2]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 3.3, 4]} />
        <meshStandardMaterial color="#1e1e1e" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Designer L-Shape Sofa */}
      <mesh position={[-5, 0.4, 1]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.6, 2]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      {/* Gourmet Kitchen Island */}
      <mesh position={[6, 0.6, -3]} castShadow receiveShadow name="kitchen-island">
        <boxGeometry args={[3.5, 1.0, 1.8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.2} />
      </mesh>
    </group>
  );
}
