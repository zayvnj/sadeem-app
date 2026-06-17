"use client"

import React, { useEffect, useRef, Suspense } from "react"
import { useGLTF, useAnimations } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { Group } from "three"

function Model() {
  const group = useRef<Group>(null)
  const { scene, animations } = useGLTF("/mascot.glb")
  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    if (names.length > 0) {
      // Play the first animation in the GLTF file on a continuous loop
      const firstAnimationName = names[0]
      const action = actions[firstAnimationName]
      if (action) {
        action.reset().fadeIn(0.5).play()
      }
    }
  }, [actions, names])

  return (
    <group ref={group} dispose={null}>
      {/* Position and scale can be adjusted here if needed, but we'll try to center it */}
      <primitive object={scene} scale={1} position={[0, -1, 0]} />
    </group>
  )
}

export function Mascot3D() {
  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-[200] flex justify-center w-full"
      style={{ bottom: "100%", height: "80px", marginBottom: "-10px" }} // Allow some overlap with the nav if needed
    >
      <div className="w-[100px] h-[100px]">
        <Canvas
          camera={{ position: [0, 1, 5], fov: 50 }}
          style={{ width: "100%", height: "100%", pointerEvents: "none" }}
        >
          {/* Ambient light for general illumination */}
          <ambientLight intensity={1.5} />
          {/* Directional light for shadows/highlights */}
          <directionalLight position={[10, 10, 10]} intensity={1} />

          <Suspense fallback={null}>
            <Model />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
