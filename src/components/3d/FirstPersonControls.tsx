'use client';

import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface FirstPersonControlsProps {
  enabled: boolean;
  onPositionChange?: (pos: THREE.Vector3) => void;
  mobileMoveVector?: { x: number; y: number };
}

export function FirstPersonControls({ enabled, onPositionChange, mobileMoveVector }: FirstPersonControlsProps) {
  const { camera, gl } = useThree();

  const keys = useRef<{ [key: string]: boolean }>({});
  const isPointerLocked = useRef(false);
  
  // Camera Euler angles
  const yaw = useRef(0);
  const pitch = useRef(0);

  // Player position state
  const playerPos = useRef(new THREE.Vector3(0, 1.7, 8)); // Start at entrance foyer

  useEffect(() => {
    // Initial camera placement
    camera.position.copy(playerPos.current);
    camera.lookAt(0, 1.7, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enabled || !isPointerLocked.current) return;
      const sensitivity = 0.0022;
      yaw.current -= e.movementX * sensitivity;
      pitch.current -= e.movementY * sensitivity;

      // Clamp pitch to avoid flipping over upside down (-85 deg to +85 deg)
      pitch.current = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitch.current));
    };

    const handleCanvasClick = () => {
      if (!enabled) return;
      gl.domElement.requestPointerLock();
    };

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === gl.domElement;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('click', handleCanvasClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('click', handleCanvasClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [camera, enabled, gl]);

  useFrame((_, delta) => {
    if (!enabled) return;

    // Movement speed in meters per second
    const speed = (keys.current['ShiftLeft'] || keys.current['ShiftRight']) ? 6.0 : 3.5;
    const moveDist = speed * Math.min(delta, 0.1);

    // Direction vector relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));

    const moveVector = new THREE.Vector3();

    // Keyboard inputs
    if (keys.current['KeyW'] || keys.current['ArrowUp']) moveVector.add(forward);
    if (keys.current['KeyS'] || keys.current['ArrowDown']) moveVector.sub(forward);
    if (keys.current['KeyD'] || keys.current['ArrowRight']) moveVector.add(right);
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) moveVector.sub(leftVector(forward));

    // Touch joystick inputs if active on mobile
    if (mobileMoveVector && (mobileMoveVector.x !== 0 || mobileMoveVector.y !== 0)) {
      moveVector.addScaledVector(forward, -mobileMoveVector.y);
      moveVector.addScaledVector(right, mobileMoveVector.x);
    }

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(moveDist);

      const nextX = playerPos.current.x + moveVector.x;
      const nextZ = playerPos.current.z + moveVector.z;

      // ================= PHYSICAL COLLISION ENGINE =================
      const radius = 0.5; // Player body radius

      // 1. Outer Wall Boundaries (Villa perimeter)
      let resolvedX = nextX;
      let resolvedZ = nextZ;

      // Outer Left Wall (X = -10) & Outer Right Wall (X = 10)
      if (resolvedX - radius < -9.5) resolvedX = -9.5 + radius;
      if (resolvedX + radius > 9.5) resolvedX = 9.5 - radius;

      // Outer Back Wall (Z = -8)
      if (resolvedZ - radius < -7.7) resolvedZ = -7.7 + radius;

      // Outer Front Wall (Z = 8, except for entrance doorway between X=[1.5, 6.5])
      if (resolvedZ + radius > 7.7 && !(resolvedX > 1.5 && resolvedX < 6.5)) {
        resolvedZ = 7.7 - radius;
      }

      // Outer Lawn / Garden Perimeter
      if (resolvedZ > 17.5) resolvedZ = 17.5;

      // 2. Interior Partition Wall (X = 2, Z between -5 and 5, with doorway gap)
      if (Math.abs(resolvedX - 2.0) < radius + 0.15) {
        // Doorway gap between Z=[-1.5, 0.5]
        if (resolvedZ < -1.5 || resolvedZ > 0.5) {
          resolvedX = playerPos.current.x; // Block X movement into partition wall
        }
      }

      playerPos.current.x = resolvedX;
      playerPos.current.z = resolvedZ;
    }

    // ================= FLOOR & STAIR HEIGHT RESOLVER =================
    const currentX = playerPos.current.x;
    const currentZ = playerPos.current.z;

    let targetEyeY = 1.7; // Default Ground floor eye height

    // Check Staircase region (X between 0.4 and 2.6, Z between -1.5 and 3.2)
    if (currentX >= 0.4 && currentX <= 2.6 && currentZ >= -1.5 && currentZ <= 3.2) {
      // Linear stair slope calculation: Z=3.2 is bottom (y=0.2), Z=-1.5 is top (y=3.5)
      const stairT = (3.2 - currentZ) / (3.2 - (-1.5));
      const clampedT = Math.max(0, Math.min(1, stairT));
      const stairFloorY = 0.2 + clampedT * (3.5 - 0.2);
      targetEyeY = stairFloorY + 1.5; // eye height
    } else if (playerPos.current.y > 3.0 && (currentZ < 3.2 || currentX < -2.0 || currentX > 3.0)) {
      // Upper Floor Level (y = 3.5 floor + 1.6 eye = 5.1m)
      targetEyeY = 5.1;
    }

    // Smooth height transition
    playerPos.current.y += (targetEyeY - playerPos.current.y) * 0.15;

    // Apply rotation & position to camera
    const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
    camera.position.copy(playerPos.current);

    if (onPositionChange) {
      onPositionChange(playerPos.current);
    }
  });

  return null;
}

function leftVector(forward: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(-forward.z, 0, forward.x);
}
