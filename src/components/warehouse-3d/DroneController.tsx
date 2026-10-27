"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

interface DroneControllerProps {
  active: boolean;
  onExit: () => void;
}

export const DroneController: React.FC<DroneControllerProps> = ({
  active,
  onExit,
}) => {
  const { camera } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  const [hudState, setHudState] = useState({
    altitude: 2.0,
    speed: 0.0,
    distance: 0.0,
    heading: 0,
  });

  const mouseState = useRef({ isDown: false, prevX: 0, prevY: 0 });
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  useEffect(() => {
    if (!active) return;

    // Set initial drone camera position inside aisle
    camera.position.set(0, 2.2, 15);
    camera.lookAt(0, 2.2, 0);
    euler.current.setFromQuaternion(camera.quaternion);

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (e.key === "Escape") {
        onExit();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      mouseState.current.isDown = true;
      mouseState.current.prevX = e.clientX;
      mouseState.current.prevY = e.clientY;
    };

    const handleMouseUp = () => {
      mouseState.current.isDown = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseState.current.isDown) return;
      const deltaX = e.clientX - mouseState.current.prevX;
      const deltaY = e.clientY - mouseState.current.prevY;
      mouseState.current.prevX = e.clientX;
      mouseState.current.prevY = e.clientY;

      euler.current.y -= deltaX * 0.003;
      euler.current.x -= deltaY * 0.003;
      euler.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.current.x));

      camera.quaternion.setFromEuler(euler.current);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [active, camera, onExit]);

  useFrame((_, delta) => {
    if (!active) return;

    const moveSpeed = (keys.current["shift"] ? 10 : 5) * delta;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0);

    // Keep horizontal movement along floor plane
    forward.y = 0;
    forward.normalize();
    right.y = 0;
    right.normalize();

    let moved = false;

    if (keys.current["w"] || keys.current["arrowup"]) {
      camera.position.addScaledVector(forward, moveSpeed);
      moved = true;
    }
    if (keys.current["s"] || keys.current["arrowdown"]) {
      camera.position.addScaledVector(forward, -moveSpeed);
      moved = true;
    }
    if (keys.current["a"] || keys.current["arrowleft"]) {
      camera.position.addScaledVector(right, -moveSpeed);
      moved = true;
    }
    if (keys.current["d"] || keys.current["arrowright"]) {
      camera.position.addScaledVector(right, moveSpeed);
      moved = true;
    }
    if (keys.current[" "] || keys.current["e"]) {
      camera.position.addScaledVector(up, moveSpeed);
      moved = true;
    }
    if (keys.current["q"] || keys.current["control"]) {
      camera.position.addScaledVector(up, -moveSpeed);
      moved = true;
    }

    // Limit floor and ceiling bounds
    if (camera.position.y < 0.8) camera.position.y = 0.8;
    if (camera.position.y > 18) camera.position.y = 18;

    // Update HUD telemetry periodically
    const dist = Math.round(
      Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2),
    );
    const deg = Math.round(
      ((-euler.current.y * 180) / Math.PI) % 360,
    );
    const heading = deg < 0 ? deg + 360 : deg;

    setHudState({
      altitude: parseFloat(camera.position.y.toFixed(1)),
      speed: moved ? parseFloat((moveSpeed / delta).toFixed(1)) : 0,
      distance: dist,
      heading,
    });
  });

  if (!active) return null;

  return null;
};
