'use client'

import { useEffect, useState } from 'react'
import { motion, useAnimation, Variants } from 'framer-motion'

export function AstronautMascot() {
  const [state, setState] = useState<'running' | 'tired' | 'resting'>('running')
  const [direction, setDirection] = useState<'left' | 'right'>('left')
  const [restPos, setRestPos] = useState(0) // 0 to 4 for the 5 buttons
  const controls = useAnimation()

  // Main state machine
  useEffect(() => {
    let isMounted = true

    const runSequence = async () => {
      while (isMounted) {
        // --- 1. RUNNING STATE (15s) ---
        setState('running')

        // Let's run back and forth a few times to total ~15s
        // Start running from Right (translateX ~vw) to Left (0)
        for (let i = 0; i < 3; i++) {
          setDirection('left')
          await controls.start({
            x: ['calc(100vw - 4rem)', '0vw'], // run full width
            transition: { duration: 2.5, ease: 'linear' }
          })

          if (!isMounted) break;

          setDirection('right')
          await controls.start({
            x: ['0vw', 'calc(100vw - 4rem)'],
            transition: { duration: 2.5, ease: 'linear' }
          })
        }

        if (!isMounted) break;

        // Ensure we are near center or randomly positioned before getting tired
        const randomXPos = Math.random() * 60 + 20; // 20vw to 80vw

        // Determine nearest direction
        setDirection(Math.random() > 0.5 ? 'left' : 'right')
        await controls.start({
            x: `calc(${randomXPos}vw - 2rem)`,
            transition: { duration: 1, ease: 'easeOut' }
        });

        if (!isMounted) break;

        // --- 2. TIRED STATE (3s) ---
        setState('tired')
        await new Promise(r => setTimeout(r, 3000))

        if (!isMounted) break;

        // --- 3. RESTING STATE (5s) ---
        // Pick a random button (0 to 4)
        const randomButtonIndex = Math.floor(Math.random() * 5)
        setRestPos(randomButtonIndex)
        setState('resting')

        // Move to the exact button center.
        // 5 buttons evenly spaced in a flex container.
        // Button centers are approx at 10%, 30%, 50%, 70%, 90%
        const buttonCenters = [10, 30, 50, 70, 90]
        const targetPct = buttonCenters[randomButtonIndex]

        // Move into resting position (sit down)
        // Set direction to left (default sitting direction, maybe random too)
        setDirection(targetPct > 50 ? 'left' : 'right')

        await controls.start({
          x: `calc(${targetPct}% - 2rem)`,
          transition: { duration: 0.5, ease: 'easeInOut' }
        })

        await new Promise(r => setTimeout(r, 5000))
      }
    }

    runSequence()

    return () => {
      isMounted = false
    }
  }, [controls])

  return (
    <div className="absolute left-0 right-0 pointer-events-none z-[100] w-full h-0" style={{ bottom: '100%' }}>
      <motion.div
        className="absolute bottom-0 w-16 h-16 origin-bottom"
        animate={controls}
        initial={{ x: 'calc(100% - 4rem)' }}
      >
        <motion.div
            className="w-full h-full origin-bottom"
            animate={{
                scaleX: direction === 'left' ? 1 : -1,
                y: state === 'resting' ? 24 : 0 // Drop down to sit on the edge
            }}
            transition={{ duration: 0.3 }}
        >
             {/* Mascot Body & Animations */}
             <div className="relative w-full h-full drop-shadow-lg">

                {/* SVG Chibi Astronaut */}
                <svg viewBox="-20 -20 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">

                    {/* LEGS: Animated differently based on state */}
                    <g className="legs">
                        {/* Left Leg (Back) */}
                        <motion.g
                            style={{ transformOrigin: '40px 75px' }}
                            animate={
                                state === 'running'
                                  ? { rotate: [20, -20, 20] }
                                  : state === 'resting'
                                    ? { rotate: [-40, -10, -40] } // Dangling & bouncing
                                    : { rotate: 0 }
                            }
                            transition={
                                state === 'running'
                                  ? { repeat: Infinity, duration: 0.4, ease: "linear" }
                                  : state === 'resting'
                                    ? { repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.2 }
                                    : { duration: 0.2 }
                            }
                        >
                            {/* Leg base */}
                            <path d="M 40 75 L 35 95" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
                            {/* Blue Stripe */}
                            <path d="M 38 80 L 42 80" stroke="#3b82f6" strokeWidth="3" />
                            {/* Boot (Grey) */}
                            <path d="M 35 95 L 30 100 L 40 100 Z" fill="#6b7280" />
                        </motion.g>

                        {/* Right Leg (Front) */}
                        <motion.g
                            style={{ transformOrigin: '60px 75px' }}
                            animate={
                                state === 'running'
                                  ? { rotate: [-20, 20, -20] }
                                  : state === 'resting'
                                    ? { rotate: [-45, -15, -45] } // Dangling & bouncing
                                    : { rotate: 0 }
                            }
                            transition={
                                state === 'running'
                                  ? { repeat: Infinity, duration: 0.4, ease: "linear" }
                                  : state === 'resting'
                                    ? { repeat: Infinity, duration: 2, ease: "easeInOut" }
                                    : { duration: 0.2 }
                            }
                        >
                             <path d="M 60 75 L 65 95" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
                             {/* Blue Stripe */}
                             <path d="M 58 80 L 62 80" stroke="#3b82f6" strokeWidth="3" />
                             {/* Boot (Grey) */}
                             <path d="M 65 95 L 60 100 L 70 100 Z" fill="#6b7280" />
                        </motion.g>
                    </g>

                    {/* TORSO & HEAD - Bouncing when running, shaking when tired */}
                    <motion.g
                        style={{ transformOrigin: '50px 80px' }}
                        animate={
                            state === 'running'
                                ? { y: [0, -4, 0] }
                                : state === 'tired'
                                    ? { y: [0, 1, 0, 1, 0], scaleY: [1, 0.95, 1, 0.95, 1] } // Chest heave
                                    : { y: 0, scaleY: 1 }
                        }
                        transition={
                            state === 'running'
                                ? { repeat: Infinity, duration: 0.4, ease: "easeInOut" }
                                : state === 'tired'
                                    ? { repeat: Infinity, duration: 0.8, ease: "easeInOut" }
                                    : { duration: 0.2 }
                        }
                    >
                        {/* Arms (Back) */}
                        <motion.g
                             style={{ transformOrigin: '30px 55px' }}
                             animate={
                                 state === 'running' ? { rotate: [30, -30, 30] } : state === 'tired' ? { rotate: 10 } : { rotate: 20 }
                             }
                             transition={
                                 state === 'running' ? { repeat: Infinity, duration: 0.4, ease: "linear" } : { duration: 0.3 }
                             }
                        >
                            <path d="M 30 55 L 20 75" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
                            {/* Blue Stripe */}
                            <path d="M 27 60 L 23 62" stroke="#3b82f6" strokeWidth="2" />
                            {/* Glove */}
                            <circle cx="20" cy="75" r="5" fill="#6b7280" />
                        </motion.g>

                        {/* Body (White) */}
                        <path d="M 30 75 Q 50 85 70 75 L 65 40 L 35 40 Z" fill="#fff" />

                        {/* Red Thick Belt */}
                        <path d="M 32 72 Q 50 78 68 72" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" fill="none" />

                        {/* Arms (Front) */}
                        <motion.g
                             style={{ transformOrigin: '70px 55px' }}
                             animate={
                                 state === 'running' ? { rotate: [-30, 30, -30] } : state === 'tired' ? { rotate: -10 } : { rotate: -20 }
                             }
                             transition={
                                 state === 'running' ? { repeat: Infinity, duration: 0.4, ease: "linear" } : { duration: 0.3 }
                             }
                        >
                            <path d="M 70 55 L 80 75" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
                            {/* Blue Stripe */}
                            <path d="M 73 60 L 77 62" stroke="#3b82f6" strokeWidth="2" />
                            {/* Glove */}
                            <circle cx="80" cy="75" r="5" fill="#6b7280" />
                        </motion.g>

                        {/* Head Base (White) */}
                        <ellipse cx="50" cy="35" rx="35" ry="30" fill="#fff" />

                        {/* Antenna */}
                        <path d="M 25 15 Q 15 5 10 10" stroke="#d1d5db" strokeWidth="2" fill="none" />
                        <circle cx="10" cy="10" r="3" fill="#ef4444" />

                        {/* Large Visor (Pitch Black & Glossy) */}
                        <ellipse cx="45" cy="35" rx="26" ry="20" fill="#000" />

                        {/* Glossy Highlights */}
                        <path d="M 25 25 Q 40 18 55 22" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
                        <path d="M 65 35 A 5 5 0 0 1 65 45" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3" />

                        {/* Neon "zain" Glow Text inside Visor */}
                        <text
                            x="45"
                            y="40"
                            fontFamily="monospace"
                            fontWeight="bold"
                            fontSize="10"
                            fill="#a5f3fc" // Cyan/Light blue
                            textAnchor="middle"
                            style={{ filter: 'drop-shadow(0px 0px 3px #06b6d4)' }}
                        >
                            zain
                        </text>

                        {/* Tired Sweat Drops */}
                        {state === 'tired' && (
                            <motion.g
                                animate={{ y: [0, 5], opacity: [1, 0] }}
                                transition={{ repeat: Infinity, duration: 0.6 }}
                            >
                                <path d="M 85 25 Q 88 30 85 32 Q 82 30 85 25 Z" fill="#38bdf8" opacity="0.8" />
                                <path d="M 90 20 Q 92 23 90 25 Q 88 23 90 20 Z" fill="#38bdf8" opacity="0.6" />
                            </motion.g>
                        )}
                    </motion.g>
                </svg>
             </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
