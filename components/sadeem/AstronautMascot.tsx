'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useAnimation, useMotionValue } from 'framer-motion'

// New precise state machine based on realistic requirements
type MascotState = 'running' | 'tired' | 'sitting' | 'flying' | 'sliding' | 'landing_rest' | 'interacted'
type Direction = 'left' | 'right'

export function AstronautMascot({ activeTab, tabsKeys, dark }: { activeTab: string, tabsKeys: string[], dark?: boolean }) {
  const [state, setState] = useState<MascotState>('running')
  const [direction, setDirection] = useState<Direction>('right')

  const x = useMotionValue(0)
  const y = useMotionValue(0) // Used for flying/jumping. For walking, it's firmly 0.
  const controls = useAnimation()

  const activeTabIndexRef = useRef(tabsKeys.indexOf(activeTab))
  const stateRef = useRef(state)
  const isMountedRef = useRef(true)

  // Keep refs updated for animation loop access
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Calculate pixel positions for tabs (used for flying/sliding interruptions)
  const getTabPosition = (index: number) => {
    if (typeof window === 'undefined') return 0
    const tabEl = document.getElementById(`nav-tab-${index}`)
    const navEl = document.getElementById('bottom-nav-container')
    if (tabEl && navEl) {
      const tabRect = tabEl.getBoundingClientRect()
      const navRect = navEl.getBoundingClientRect()
      return tabRect.left - navRect.left + (tabRect.width / 2)
    }
    const w = navEl ? navEl.getBoundingClientRect().width : (typeof window !== 'undefined' ? window.innerWidth : 400)
    return (w / tabsKeys.length) * (index + 0.5)
  }

  // Handle Tab Switch Interruption
  useEffect(() => {
    const prevIndex = activeTabIndexRef.current
    const newIndex = tabsKeys.indexOf(activeTab)
    activeTabIndexRef.current = newIndex

    if (prevIndex === newIndex) return

    const interruptAndMove = async () => {
      if (!isMountedRef.current) return

      const currentX = x.get()
      const targetX = getTabPosition(newIndex)

      const navEl = document.getElementById('bottom-nav-container')
      const w = navEl ? navEl.getBoundingClientRect().width : (typeof window !== 'undefined' ? window.innerWidth : 400)
      const tabWidth = w / tabsKeys.length
      const distanceInTabs = Math.abs(targetX - currentX) / tabWidth

      controls.stop() // Stop current routine

      setDirection(targetX > currentX ? 'right' : 'left')

      if (distanceInTabs > 1.5) {
        // Fly (Jetpack) - brief interruption
        setState('flying')
        await controls.start({
          x: targetX - 32, // Center the 64px wide mascot
          y: [-20, -40, -10, 0], // Arc trajectory
          transition: { duration: 0.8, ease: "easeInOut", times: [0, 0.4, 0.8, 1] }
        })
      } else {
        // Slide (Agile dash) - brief interruption
        setState('sliding')
        await controls.start({
          x: targetX - 32,
          y: 0,
          transition: { duration: 0.4, ease: "anticipate" }
        })
      }

      if (!isMountedRef.current) return

      // Brief landing rest before resuming routine
      setState('landing_rest')
      controls.set({ y: 0 }) // Keep feet strictly on the ground
      await new Promise(r => setTimeout(r, 1000))

      if (!isMountedRef.current) return
      setState('running')
      triggerRoutine() // Restart routine
    }

    interruptAndMove()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // --- Real-world State Machine Routine ---
  const triggerRoutineRef = useRef<() => void>(() => {})

  useEffect(() => {
    const routine = async () => {
      while (isMountedRef.current) {
        // Wait if interrupted by user action (flying/sliding/interacted)
        if (['flying', 'sliding', 'interacted', 'landing_rest'].includes(stateRef.current)) {
          await new Promise(r => setTimeout(r, 500))
          continue
        }

        // --- 1. Running Phase (20 seconds) ---
        setState('running')
        const runDuration = 20000
        const startTime = Date.now()
        let currentDir = direction

        while (Date.now() - startTime < runDuration && stateRef.current === 'running' && isMountedRef.current) {
           const navEl = document.getElementById('bottom-nav-container')
           const parentEl = navEl?.parentElement || navEl;
           const w = parentEl ? parentEl.getBoundingClientRect().width : (typeof window !== 'undefined' ? window.innerWidth : 400)
           const mascotWidth = 64
           const boundsLeft = 0
           const boundsRight = w - mascotWidth

           const currentX = x.get()

           // If we reached an edge, turn around
           if (currentDir === 'right' && currentX >= boundsRight - 5) currentDir = 'left'
           if (currentDir === 'left' && currentX <= boundsLeft + 5) currentDir = 'right'

           setDirection(currentDir)

           const targetX = currentDir === 'right' ? boundsRight : boundsLeft
           const dist = Math.abs(targetX - currentX)
           const time = (dist / w) * 10 // Fixed comfortable running speed

           // Start moving towards the wall. We await a fraction of the time, or until wall is hit.
           // To allow the loop to re-check duration, we move in small chunks or just rely on the wall hit.
           await controls.start({
             x: targetX,
             y: 0, // STRICTLY 0
             transition: { duration: time, ease: "linear" }
           })
        }

        if (stateRef.current !== 'running' || !isMountedRef.current) continue

        // --- 2. Tired Phase (5 seconds) ---
        setState('tired')
        controls.stop() // Stop running movement

        let tiredTime = 0
        while(tiredTime < 5000 && stateRef.current === 'tired' && isMountedRef.current) {
           await new Promise(r => setTimeout(r, 500))
           tiredTime += 500
        }

        if (stateRef.current !== 'tired' || !isMountedRef.current) continue

        // --- 3. Sitting Phase (10 seconds) ---
        setState('sitting')
        // We stay at current X, Y stays 0 (SVG handles the leg dangle natively)

        let sittingTime = 0
        while(sittingTime < 10000 && stateRef.current === 'sitting' && isMountedRef.current) {
           await new Promise(r => setTimeout(r, 500))
           sittingTime += 500
        }

        if (stateRef.current === 'sitting') {
           setState('running')
        }
      }
    }

    triggerRoutineRef.current = () => {
       // Fire and forget, loop handles it
    }

    routine()

    return () => { isMountedRef.current = false }
  }, [controls, x, direction])

  const triggerRoutine = () => triggerRoutineRef.current()

  const handleInteract = async () => {
    if (state === 'flying' || state === 'sliding') return
    const prevState = state
    setState('interacted')
    controls.stop()

    // Jump interaction (Y axis changes temporarily, then returns strictly to 0)
    await controls.start({
      y: [-10, -50, -40, 0],
      rotate: [0, 360],
      transition: { duration: 1.2, ease: "easeOut" }
    })

    if (isMountedRef.current) {
       setState(prevState === 'landing_rest' || prevState === 'sitting' ? 'sitting' : 'running')
       controls.set({ y: 0 }) // Strictly back to floor
       controls.set({ rotate: 0 })
    }
  }

  // --- Visuals computation based on state ---
  const isRunning = state === 'running' || state === 'sliding'
  const isTired = state === 'tired'
  const isSitting = state === 'sitting' || state === 'landing_rest'
  const isFlying = state === 'flying' || state === 'interacted'

  return (
    <div className="absolute left-0 right-0 pointer-events-none z-[200] w-full h-0" style={{ bottom: 'calc(100% - 2px)' }}>
      <motion.div
        className="absolute bottom-0 w-16 h-16 origin-bottom pointer-events-auto cursor-pointer"
        style={{
            x,
            y,
            willChange: 'transform' // Hardware acceleration for anti-jitter
        }}
        animate={controls}
        initial={{ x: 20, y: 0 }}
        onClick={handleInteract}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
            className="w-full h-full origin-bottom relative"
            animate={{ scaleX: direction === 'left' ? -1 : 1 }}
            transition={{ duration: 0.3 }}
            style={{ willChange: 'transform' }}
        >
             {/* Dynamic Flashlight in Dark Mode */}
             {dark && (
                <motion.div
                   className="absolute top-4 left-10 w-24 h-12 origin-left pointer-events-none"
                   style={{
                     background: 'linear-gradient(90deg, rgba(165, 243, 252, 0.4) 0%, rgba(165, 243, 252, 0) 100%)',
                     clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 60%)',
                     transform: 'rotate(15deg)',
                     zIndex: -1,
                     filter: 'blur(2px)'
                   }}
                   animate={{ opacity: [0.3, 0.6, 0.3] }}
                   transition={{ repeat: Infinity, duration: 2 }}
                />
             )}

             {/* Jetpack Flame */}
             {isFlying && (
                 <motion.div
                    className="absolute top-6 -left-3 w-6 h-8 origin-top"
                    animate={{ scaleY: [1, 1.5, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 0.1 }}
                 >
                     <div className="w-full h-full rounded-full bg-gradient-to-b from-blue-400 via-orange-400 to-transparent blur-[2px]" />
                 </motion.div>
             )}

             <div className="relative w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">
                {/* Hyper-Realistic pseudo-3D SVG Astronaut */}
                <svg viewBox="-20 -20 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">

                    <defs>
                        <radialGradient id="helmetGrad" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" stopColor={dark ? "#e5e7eb" : "#ffffff"} />
                            <stop offset="70%" stopColor={dark ? "#9ca3af" : "#d1d5db"} />
                            <stop offset="100%" stopColor={dark ? "#4b5563" : "#9ca3af"} />
                        </radialGradient>
                        <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1f2937" />
                            <stop offset="40%" stopColor="#000000" />
                            <stop offset="100%" stopColor="#111827" />
                        </linearGradient>
                        <linearGradient id="suitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={dark ? "#f3f4f6" : "#ffffff"} />
                            <stop offset="100%" stopColor={dark ? "#d1d5db" : "#e5e7eb"} />
                        </linearGradient>
                        <radialGradient id="jetpackGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#9ca3af" />
                            <stop offset="100%" stopColor="#374151" />
                        </radialGradient>
                    </defs>

                    {/* Jetpack (Backpack) */}
                    <path d="M 15 40 h 15 v 40 h -15 z" fill="url(#jetpackGrad)" stroke="#1f2937" strokeWidth="2" rx="4" />
                    {dark && <path d="M 20 45 h 5 v 20 h -5 z" fill="#06b6d4" filter="blur(1px)" />}

                    {/* LEGS */}
                    <g className="legs">
                        {/* Left Leg (Back) */}
                        <motion.g
                            style={{ transformOrigin: '40px 75px' }}
                            animate={
                                isRunning
                                  ? { rotate: [30, -30, 30] } // Running stride
                                  : isTired
                                    ? { rotate: 5, y: 2 } // Legs slightly buckled when tired
                                    : isSitting
                                      ? { rotate: -80, y: 5 } // Sitting 90 deg forward (dangling)
                                      : isFlying
                                        ? { rotate: -10 }
                                        : { rotate: 0 }
                            }
                            transition={
                                isRunning
                                  ? { repeat: Infinity, duration: state === 'sliding' ? 0.2 : 0.6, ease: "linear" }
                                  : isSitting
                                    ? { duration: 0.5, ease: "easeInOut" }
                                    : { duration: 0.3 }
                            }
                        >
                            <path d="M 40 75 L 35 95" stroke="url(#suitGrad)" strokeWidth="14" strokeLinecap="round" />
                            <path d="M 38 82 L 43 82" stroke={dark ? "#06b6d4" : "#3b82f6"} strokeWidth="3" />
                            <path d="M 32 95 Q 35 102 42 100 L 44 95 Z" fill="#4b5563" />
                        </motion.g>

                        {/* Right Leg (Front) */}
                        <motion.g
                            style={{ transformOrigin: '60px 75px' }}
                            animate={
                                isRunning
                                  ? { rotate: [-30, 30, -30] } // Running stride opposing
                                  : isTired
                                    ? { rotate: -5, y: 2 } // Tired buckle
                                    : isSitting
                                      ? { rotate: -70, y: 5 } // Sitting dangling (offset slightly from back leg for perspective)
                                      : isFlying
                                        ? { rotate: -20 }
                                        : { rotate: 0 }
                            }
                            transition={
                                isRunning
                                  ? { repeat: Infinity, duration: state === 'sliding' ? 0.2 : 0.6, ease: "linear" }
                                  : isSitting
                                    ? { duration: 0.5, ease: "easeInOut" }
                                    : { duration: 0.3 }
                            }
                        >
                             <path d="M 60 75 L 65 95" stroke="url(#suitGrad)" strokeWidth="14" strokeLinecap="round" />
                             <path d="M 58 82 L 63 82" stroke={dark ? "#06b6d4" : "#3b82f6"} strokeWidth="3" />
                             <path d="M 62 95 Q 65 102 72 100 L 74 95 Z" fill="#4b5563" />
                        </motion.g>
                    </g>

                    {/* TORSO & HEAD */}
                    <motion.g
                        style={{ transformOrigin: '50px 80px' }}
                        animate={
                            isRunning
                                ? { y: [0, -4, 0] } // Running bounce
                                : isTired
                                  ? { rotate: 15, y: [4, 6, 4] } // Hunch forward, heavy breathing
                                  : isSitting
                                    ? { y: 15, rotate: 5 } // Drop down to sit, slight slouch
                                    : isFlying
                                      ? { rotate: 15 }
                                      : { y: 0, rotate: 0 }
                        }
                        transition={
                            isRunning
                                ? { repeat: Infinity, duration: state === 'sliding' ? 0.2 : 0.6, ease: "easeInOut" }
                                : isTired
                                  ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } // Panting loop
                                  : isSitting
                                    ? { duration: 0.5, ease: "easeOut" }
                                    : { duration: 0.2 }
                        }
                    >
                        {/* Arms (Back) */}
                        <motion.g
                             style={{ transformOrigin: '35px 55px' }}
                             animate={
                                 isRunning ? { rotate: [45, -45, 45] }
                                 : isTired ? { rotate: 10 } // Arm hanging low
                                 : isSitting ? { rotate: 20 }
                                 : isFlying ? { rotate: -30 }
                                 : { rotate: 0 }
                             }
                             transition={
                                 isRunning ? { repeat: Infinity, duration: state === 'sliding' ? 0.2 : 0.6, ease: "linear" } : { duration: 0.3 }
                             }
                        >
                            <path d="M 35 55 L 25 75" stroke="url(#suitGrad)" strokeWidth="12" strokeLinecap="round" />
                            <circle cx="25" cy="75" r="6" fill="#4b5563" />
                        </motion.g>

                        {/* Body */}
                        <path d="M 30 75 Q 50 88 70 75 L 65 40 L 35 40 Z" fill="url(#suitGrad)" />

                        {/* Shading/Creases on suit */}
                        <path d="M 35 50 Q 50 55 65 50" stroke="#9ca3af" strokeWidth="1" fill="none" opacity="0.5" />
                        <path d="M 32 60 Q 50 65 68 60" stroke="#9ca3af" strokeWidth="1" fill="none" opacity="0.5" />

                        {/* Tech Belt */}
                        <rect x="30" y="70" width="40" height="8" rx="2" fill="#374151" />
                        <circle cx="50" cy="74" r="3" fill={dark ? "#06b6d4" : "#ef4444"} />
                        <rect x="35" y="72" width="5" height="4" fill="#9ca3af" />
                        <rect x="60" y="72" width="5" height="4" fill="#9ca3af" />

                        {/* Chest Plate */}
                        <rect x="40" y="45" width="20" height="15" rx="3" fill="#e5e7eb" stroke="#d1d5db" />
                        <circle cx="45" cy="52" r="2" fill="#3b82f6" />
                        <circle cx="55" cy="52" r="2" fill="#10b981" />

                        {/* Arms (Front) */}
                        <motion.g
                             style={{ transformOrigin: '65px 55px' }}
                             animate={
                                 isRunning ? { rotate: [-45, 45, -45] }
                                 : isTired ? { rotate: 30, x: 2, y: 5 } // Hand on knee/slouched
                                 : isSitting ? { rotate: -20, x: -5, y: 5 } // Resting in lap
                                 : isFlying ? { rotate: 50, x: -10, y: -10 }
                                 : { rotate: 0 }
                             }
                             transition={
                                 isRunning ? { repeat: Infinity, duration: state === 'sliding' ? 0.2 : 0.6, ease: "linear" } : { duration: 0.3 }
                             }
                        >
                            <path d="M 65 55 L 75 75" stroke="url(#suitGrad)" strokeWidth="12" strokeLinecap="round" />
                            <path d="M 70 65 L 75 67" stroke={dark ? "#06b6d4" : "#3b82f6"} strokeWidth="3" />
                            <circle cx="75" cy="75" r="6" fill="#4b5563" />
                        </motion.g>

                        {/* Head/Helmet Base */}
                        <motion.g
                            style={{ transformOrigin: '50px 35px' }}
                            animate={
                                isTired ? { rotate: [0, -5, 0], y: [0, 2, 0] } : { rotate: 0, y: 0 }
                            }
                            transition={
                                isTired ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { duration: 0.3 }
                            }
                        >
                            <ellipse cx="50" cy="35" rx="35" ry="32" fill="url(#helmetGrad)" />

                            {/* Helmet Rings/Details */}
                            <path d="M 15 35 A 35 32 0 0 0 85 35" stroke="#9ca3af" strokeWidth="2" fill="none" opacity="0.6" />
                            <ellipse cx="50" cy="35" rx="38" ry="35" fill="none" stroke={dark ? "rgba(6, 182, 212, 0.2)" : "none"} strokeWidth="2" />

                            {/* Visor */}
                            <ellipse cx="48" cy="35" rx="26" ry="20" fill="url(#visorGrad)" />

                            {/* Glossy Highlights on Visor */}
                            <path d="M 30 25 Q 45 15 60 20" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
                            <path d="M 68 35 A 6 6 0 0 1 65 45" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />

                            {/* Sharp, integrated zain. text inside Visor */}
                            <text
                                x="48"
                                y="39"
                                fontFamily="'Arial', sans-serif"
                                fontWeight="bold"
                                fontSize="12"
                                fill={dark ? "#a5f3fc" : "#e0f2fe"}
                                textAnchor="middle"
                                style={{
                                    filter: dark ? 'drop-shadow(0px 0px 3px #06b6d4)' : 'none',
                                    userSelect: 'none'
                                }}
                            >
                                zain.
                            </text>

                            {/* Antenna */}
                            <path d="M 22 15 Q 15 5 10 10" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" fill="none" />
                            <circle cx="10" cy="10" r="4" fill={dark ? "#06b6d4" : "#ef4444"} />
                            {dark && (
                                <motion.circle
                                    cx="10" cy="10" r="6" fill="none" stroke="#06b6d4" strokeWidth="1"
                                    animate={{ scale: [1, 2], opacity: [1, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                />
                            )}
                        </motion.g>

                    </motion.g>
                </svg>
             </div>
        </motion.div>
      </motion.div>
    </div>
  )
}