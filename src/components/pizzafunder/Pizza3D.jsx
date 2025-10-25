import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

/**
 * 3D Pizza Component using Three.js
 * Shows a rotating pizza with visible crust thickness from a side angle
 */

// Pizza mesh component
function PizzaMesh() {
  const groupRef = useRef();
  const pizzaRef = useRef();

  // Auto-rotate the pizza
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3; // Rotate around Y axis
    }
  });

  // Create pepperoni positions in rings
  const pepperoniPositions = [];
  const rings = [
    { count: 5, radius: 0.4 },
    { count: 8, radius: 0.7 },
    { count: 10, radius: 1.0 }
  ];

  rings.forEach((ring, ringIndex) => {
    for (let i = 0; i < ring.count; i++) {
      const angle = (i / ring.count) * Math.PI * 2 + ringIndex * 0.4;
      const x = Math.cos(angle) * ring.radius;
      const z = Math.sin(angle) * ring.radius;
      pepperoniPositions.push({ x, z, angle: Math.random() * Math.PI * 2 });
    }
  });

  return (
    <group ref={groupRef} rotation={[-Math.PI * 0.15, 0, 0]} position={[0, -0.2, 0]}>
      {/* Main pizza base (cheese/sauce) */}
      <mesh ref={pizzaRef} receiveShadow castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.1, 64]} />
        <meshStandardMaterial 
          color="#f4d45c"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Crust ring - thicker and raised */}
      <mesh receiveShadow castShadow position={[0, 0.08, 0]}>
        <torusGeometry args={[1.3, 0.15, 16, 48]} />
        <meshStandardMaterial 
          color="#d4a574"
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      {/* Sauce layer (subtle red under cheese) */}
      <mesh position={[0, 0.051, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.02, 64]} />
        <meshStandardMaterial 
          color="#b8351a"
          roughness={0.9}
        />
      </mesh>

      {/* Pepperoni slices */}
      {pepperoniPositions.map((pos, i) => (
        <mesh 
          key={i} 
          position={[pos.x, 0.11, pos.z]} 
          rotation={[0, pos.angle, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
          <meshStandardMaterial 
            color="#a52a1a"
            roughness={0.6}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* Slice lines */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i / 8) * Math.PI * 2;
        const length = 1.2;
        return (
          <mesh 
            key={`slice-${i}`} 
            position={[
              Math.cos(angle) * length / 2,
              0.06,
              Math.sin(angle) * length / 2
            ]}
            rotation={[0, angle, 0]}
          >
            <boxGeometry args={[length, 0.01, 0.02]} />
            <meshStandardMaterial color="#8b6f47" />
          </mesh>
        );
      })}

      {/* Bottom of pizza */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.02, 64]} />
        <meshStandardMaterial 
          color="#c89a5c"
          roughness={0.9}
        />
      </mesh>
    </group>
  );
}

// Main component
export const Pizza3D = ({ className = '' }) => {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 2, 4], fov: 50 }}
        shadows
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1} 
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 3, -5]} intensity={0.3} color="#ffa500" />
        
        {/* Pizza */}
        <PizzaMesh />
        
        {/* Optional: Enable user controls (disabled by default for auto-rotation) */}
        {/* <OrbitControls enableZoom={false} enablePan={false} /> */}
        
        {/* Background */}
        <color attach="background" args={['#1a1612']} />
      </Canvas>
    </div>
  );
};
