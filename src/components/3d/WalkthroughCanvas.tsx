'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { BuildingModel } from './BuildingModel';
import { FirstPersonControls } from './FirstPersonControls';
import { HotspotMarker } from './HotspotMarker';
import { WalkthroughOverlay, CameraPreset } from './WalkthroughOverlay';
import { Hotspot, Model3D } from '@/types/database';
import { mockDb } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface WalkthroughCanvasProps {
  model?: Model3D | null;
  hotspots?: Hotspot[];
  readOnly?: boolean;
  isFrontDesk?: boolean;
  onOpenRegistration?: () => void;
  idleCountdown?: number;
}

export function WalkthroughCanvas({ 
  model: initialModel, 
  hotspots: initialHotspots,
  isFrontDesk,
  onOpenRegistration,
  idleCountdown
}: WalkthroughCanvasProps) {
  const [model, setModel] = useState<Model3D | null>(initialModel || null);
  const [hotspots, setHotspots] = useState<Hotspot[]>(initialHotspots || []);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [freeWalkEnabled, setFreeWalkEnabled] = useState(true);
  const [hotspotsVisible, setHotspotsVisible] = useState(true);
  const [mobileMoveVector, setMobileMoveVector] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  // Target camera position and lookAt for smooth transitions
  const targetCamPos = useRef<THREE.Vector3 | null>(null);
  const targetLookAt = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (!initialModel) {
      mockDb.getActiveModel().then((res) => {
        if (res) {
          setModel(res.model);
          setHotspots(res.hotspots);
        }
      });
    }
  }, [initialModel]);

  const handleSelectHotspot = (hs: Hotspot) => {
    setActiveHotspotId(hs.id);
    targetCamPos.current = new THREE.Vector3(hs.target_pos_x, hs.target_pos_y, hs.target_pos_z);
    targetLookAt.current = new THREE.Vector3(
      hs.target_pos_x + Math.sin(hs.target_rot_y),
      hs.target_pos_y,
      hs.target_pos_z - Math.cos(hs.target_rot_y)
    );
  };

  const handleSelectPreset = (preset: CameraPreset) => {
    switch (preset) {
      case 'FRONT':
        targetCamPos.current = new THREE.Vector3(0, 3, 16);
        targetLookAt.current = new THREE.Vector3(0, 1.5, 0);
        break;
      case 'BACK':
        targetCamPos.current = new THREE.Vector3(0, 4, -18);
        targetLookAt.current = new THREE.Vector3(0, 2, 0);
        break;
      case 'LEFT':
        targetCamPos.current = new THREE.Vector3(-18, 4, 0);
        targetLookAt.current = new THREE.Vector3(0, 2, 0);
        break;
      case 'RIGHT':
        targetCamPos.current = new THREE.Vector3(18, 4, 0);
        targetLookAt.current = new THREE.Vector3(0, 2, 0);
        break;
      case 'AERIAL':
        targetCamPos.current = new THREE.Vector3(0, 26, 0.1);
        targetLookAt.current = new THREE.Vector3(0, 0, 0);
        break;
      case 'DEFAULT':
      default:
        targetCamPos.current = new THREE.Vector3(0, 1.7, 8);
        targetLookAt.current = new THREE.Vector3(0, 1.7, 0);
        break;
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-950 overflow-hidden">
      {/* 3D Canvas Viewport */}
      <Canvas
        shadows
        camera={{ position: [0, 1.7, 8], fov: 65, near: 0.1, far: 1000 }}
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          {/* Lighting & Environment */}
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[20, 40, 20]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-25}
            shadow-camera-right={25}
            shadow-camera-top={25}
            shadow-camera-bottom={-25}
          />
          <Sky sunPosition={[100, 40, 100]} inclination={0.6} azimuth={0.25} />
          <Environment preset="city" />

          {/* 3D Building Architecture */}
          <BuildingModel url={model?.file_path} onLoaded={() => setIsLoaded(true)} />

          {/* Contact Shadows */}
          <ContactShadows position={[0, -0.01, 0]} opacity={0.6} scale={40} blur={1.5} far={10} resolution={512} color="#000000" />

          {/* Hotspot Markers */}
          {hotspotsVisible &&
            hotspots.map((hs) => (
              <HotspotMarker
                key={hs.id}
                hotspot={hs}
                isSelected={activeHotspotId === hs.id}
                onSelect={handleSelectHotspot}
              />
            ))}

          {/* Controls */}
          {freeWalkEnabled ? (
            <FirstPersonControls
              enabled={freeWalkEnabled}
              mobileMoveVector={mobileMoveVector}
            />
          ) : (
            <OrbitControls enablePan enableZoom maxPolarAngle={Math.PI / 2.05} target={[0, 1.7, 0]} />
          )}

          {/* Animated Camera Transition lerp helper */}
          <CameraTweenController targetPos={targetCamPos.current} targetLook={targetLookAt.current} />
        </Suspense>
      </Canvas>

      {/* Loading Overlay Spinner */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-40 flex flex-col items-center justify-center text-slate-200">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-3" />
          <h2 className="text-sm font-semibold tracking-wider text-white">Loading 3D Environment...</h2>
          <p className="text-xs text-slate-400 mt-1">Preparing spatial geometry & texture maps</p>
        </div>
      )}

      {/* Translucent HUD Overlay */}
      <WalkthroughOverlay
        projectTitle={model?.title || 'The Sky Villa — Modern Masterpiece'}
        hotspots={hotspots}
        activeHotspotId={activeHotspotId}
        onSelectHotspot={handleSelectHotspot}
        onSelectPreset={handleSelectPreset}
        freeWalkEnabled={freeWalkEnabled}
        onToggleFreeWalk={() => setFreeWalkEnabled(!freeWalkEnabled)}
        hotspotsVisible={hotspotsVisible}
        onToggleHotspots={() => setHotspotsVisible(!hotspotsVisible)}
        onMobileMove={setMobileMoveVector}
        isFrontDesk={isFrontDesk}
        onOpenRegistration={onOpenRegistration}
        idleCountdown={idleCountdown}
      />
    </div>
  );
}

function CameraTweenController({
  targetPos,
  targetLook,
}: {
  targetPos: THREE.Vector3 | null;
  targetLook: THREE.Vector3 | null;
}) {
  useFrame(({ camera }) => {
    if (targetPos) {
      camera.position.lerp(targetPos, 0.08);
      if (camera.position.distanceTo(targetPos) < 0.05) {
        targetPos = null;
      }
    }
    if (targetLook) {
      camera.lookAt(targetLook);
    }
  });
  return null;
}
