'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, useReducedMotion } from 'framer-motion'

type MascotState = 'running' | 'tired' | 'resting' | 'sleeping' | 'celebrating' | 'waving'

export function AstronautMascot() {
  const [mascotState, setMascotState] = useState<MascotState>('running')
  const [direction, setDirection] = useState<'left' | 'right'>('left')
  const [position, setPosition] = useState(0)

  const containerWidth = 448 // max-w-md
  const mascotWidth = 56 // w-14

  const shouldReduceMotion = useReducedMotion()

  // Timers and references
  const runningRef = useRef<NodeJS.Timeout | null>(null)
  const tiredRef = useRef<NodeJS.Timeout | null>(null)
  const restingRef = useRef<NodeJS.Timeout | null>(null)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const actionTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Run cycle logic
  useEffect(() => {
    if (mascotState !== 'running' && mascotState !== 'tired') return

    let lastTime = performance.now()
    let reqId: number

    const updatePosition = (time: number) => {
      const delta = time - lastTime
      lastTime = time

      if (mascotState === 'running') {
        const speed = 0.15 // pixels per ms
        setPosition(prev => {
          let nextPos = prev + (direction === 'left' ? -speed * delta : speed * delta)

          if (nextPos <= 0) {
            setDirection('right')
            nextPos = 0
          } else if (nextPos >= containerWidth - mascotWidth) {
            setDirection('left')
            nextPos = containerWidth - mascotWidth
          }
          return nextPos
        })
      } else if (mascotState === 'tired') {
         // getting tired, slows down to a stop
         const speed = 0.05
         setPosition(prev => {
          let nextPos = prev + (direction === 'left' ? -speed * delta : speed * delta)
          if (nextPos <= 0) {
            setDirection('right')
            nextPos = 0
          } else if (nextPos >= containerWidth - mascotWidth) {
            setDirection('left')
            nextPos = containerWidth - mascotWidth
          }
          return nextPos
        })
      }

      reqId = requestAnimationFrame(updatePosition)
    }

    reqId = requestAnimationFrame(updatePosition)
    return () => cancelAnimationFrame(reqId)
  }, [mascotState, direction])

  // State Machine logic (Running -> Tired -> Resting -> Running)
  useEffect(() => {
    if (mascotState === 'sleeping' || mascotState === 'celebrating' || mascotState === 'waving') return

    if (mascotState === 'running') {
      runningRef.current = setTimeout(() => {
        setMascotState('tired')
      }, 30000)
    } else if (mascotState === 'tired') {
      tiredRef.current = setTimeout(() => {
        setMascotState('resting')
      }, 2000)
    } else if (mascotState === 'resting') {
      restingRef.current = setTimeout(() => {
        setMascotState('running')
      }, 10000)
    }

    return () => {
      if (runningRef.current) clearTimeout(runningRef.current)
      if (tiredRef.current) clearTimeout(tiredRef.current)
      if (restingRef.current) clearTimeout(restingRef.current)
    }
  }, [mascotState])

  // Idle Timer logic
  useEffect(() => {
    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

      // Wake up if sleeping
      setMascotState(prev => prev === 'sleeping' ? 'running' : prev)

      idleTimerRef.current = setTimeout(() => {
        setMascotState('sleeping')
      }, 60000)
    }

    resetIdleTimer()

    window.addEventListener('touchstart', resetIdleTimer)
    window.addEventListener('click', resetIdleTimer)
    window.addEventListener('scroll', resetIdleTimer)

    return () => {
      window.removeEventListener('touchstart', resetIdleTimer)
      window.removeEventListener('click', resetIdleTimer)
      window.removeEventListener('scroll', resetIdleTimer)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  // Event Listener for Interactive Actions
  useEffect(() => {
    const handleAction = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      const action = customEvent.detail

      if (actionTimerRef.current) clearTimeout(actionTimerRef.current)

      if (action === 'celebrate') {
        setMascotState('celebrating')
        actionTimerRef.current = setTimeout(() => {
          setMascotState('running')
        }, 3000)
      } else if (action === 'wave') {
        // Quick wave
        setMascotState('waving')
        actionTimerRef.current = setTimeout(() => {
          setMascotState('running')
        }, 500)
      }
    }

    window.addEventListener('mascot-action', handleAction)
    return () => window.removeEventListener('mascot-action', handleAction)
  }, [])


  const renderStars = () => {
    if (shouldReduceMotion) return null
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50 z-[-1]">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `twinkle ${Math.random() * 3 + 2}s infinite ${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    )
  }

  // Calculate transforms for different states
  let mascotTransform = `translateX(${position}px) scaleX(${direction === 'left' ? -1 : 1})`
  let astronautBodyAnimation = ''
  let leftLegAnimation = ''
  let rightLegAnimation = ''
  let leftArmAnimation = ''
  let rightArmAnimation = ''

  if (!shouldReduceMotion) {
      if (mascotState === 'running') {
        astronautBodyAnimation = 'tiltBounce 0.5s ease-in-out infinite'
        leftLegAnimation = 'runLeftLeg 0.5s ease-in-out infinite'
        rightLegAnimation = 'runRightLeg 0.5s ease-in-out infinite'
        leftArmAnimation = 'runLeftArm 0.5s ease-in-out infinite'
        rightArmAnimation = 'runRightArm 0.5s ease-in-out infinite'
      } else if (mascotState === 'tired') {
        astronautBodyAnimation = 'pant 1s ease-in-out infinite'
        // Hands on knees slightly
        leftArmAnimation = 'tiredArm 1s ease-in-out forwards'
        rightArmAnimation = 'tiredArm 1s ease-in-out forwards'
      } else if (mascotState === 'resting') {
        astronautBodyAnimation = 'breathe 3s ease-in-out infinite'
        leftLegAnimation = 'swingLeftLeg 2s ease-in-out infinite'
        rightLegAnimation = 'swingRightLeg 2s ease-in-out infinite 1s'
      } else if (mascotState === 'sleeping') {
        astronautBodyAnimation = 'sleepTilt 4s ease-in-out infinite'
      } else if (mascotState === 'celebrating') {
        astronautBodyAnimation = 'jumpCelebrate 0.6s ease-in-out infinite'
        leftArmAnimation = 'celebrateArmLeft 0.6s ease-in-out infinite'
        rightArmAnimation = 'celebrateArmRight 0.6s ease-in-out infinite'
      } else if (mascotState === 'waving') {
        leftArmAnimation = 'waveArm 0.5s ease-in-out infinite'
      }
  }


  return (
    <div className="absolute left-0 right-0 pointer-events-none z-[100] w-full max-w-md mx-auto overflow-hidden h-[150px]" style={{ bottom: '100%', transform: 'translateY(10px)' }}>
      {renderStars()}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes tiltBounce {
          0%, 100% { transform: translateY(0) rotate(5deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        @keyframes pant {
          0%, 100% { transform: translateY(0) rotate(15deg); }
          50% { transform: translateY(2px) rotate(18deg); }
        }
        @keyframes breathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-2px) scale(1.02); }
        }
        @keyframes sleepTilt {
          0%, 100% { transform: translateY(10px) rotate(20deg); }
          50% { transform: translateY(12px) rotate(22deg); }
        }
        @keyframes jumpCelebrate {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        @keyframes runLeftLeg {
          0%, 100% { transform: rotate(20deg); }
          50% { transform: rotate(-20deg); }
        }
        @keyframes runRightLeg {
          0%, 100% { transform: rotate(-20deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes runLeftArm {
          0%, 100% { transform: rotate(-20deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes runRightArm {
          0%, 100% { transform: rotate(20deg); }
          50% { transform: rotate(-20deg); }
        }

        @keyframes tiredArm {
          to { transform: rotate(-30deg) translate(-5px, 10px); }
        }

        @keyframes swingLeftLeg {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }
        @keyframes swingRightLeg {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }

        @keyframes celebrateArmLeft {
          0%, 100% { transform: rotate(150deg) translate(-10px, -20px); }
          50% { transform: rotate(170deg) translate(-10px, -20px); }
        }
        @keyframes celebrateArmRight {
          0%, 100% { transform: rotate(-150deg) translate(10px, -20px); }
          50% { transform: rotate(-170deg) translate(10px, -20px); }
        }

        @keyframes waveArm {
          0%, 100% { transform: rotate(120deg) translate(-10px, -20px); }
          50% { transform: rotate(150deg) translate(-10px, -20px); }
        }

        @keyframes driftZZZ {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          50% { opacity: 1; transform: translate(10px, -15px) scale(1); }
          100% { opacity: 0; transform: translate(20px, -30px) scale(1.5); }
        }

        @keyframes tinyStarFloat {
           0% { opacity: 0; transform: translate(0, 0) scale(0); }
           50% { opacity: 1; transform: translate(var(--tx), var(--ty)) scale(1); }
           100% { opacity: 0; transform: translate(calc(var(--tx) * 1.5), calc(var(--ty) * 1.5)) scale(0); }
        }
      `}</style>

      <div
        className="absolute bottom-0 w-14 h-14"
        style={{
          transform: mascotTransform,
          willChange: 'transform'
        }}
      >
        <div
          className="w-full h-full relative"
          style={{
            animation: astronautBodyAnimation,
            transformOrigin: 'bottom center',
            willChange: 'transform'
          }}
        >
          {/* ZZZs for Sleeping */}
          <AnimatePresence>
            {mascotState === 'sleeping' && !shouldReduceMotion && (
              <div className="absolute -top-10 -right-8 w-10 h-10 pointer-events-none">
                <div className="absolute font-bold text-white text-sm" style={{ animation: 'driftZZZ 2s infinite' }}>Z</div>
                <div className="absolute font-bold text-white text-sm" style={{ animation: 'driftZZZ 2s infinite 0.7s', left: '10px', top: '-10px' }}>Z</div>
                <div className="absolute font-bold text-white text-sm" style={{ animation: 'driftZZZ 2s infinite 1.4s', left: '20px', top: '-20px' }}>Z</div>
              </div>
            )}
          </AnimatePresence>

          {/* Celebration Stars */}
          <AnimatePresence>
            {mascotState === 'celebrating' && !shouldReduceMotion && (
               <div className="absolute -top-8 -left-8 w-32 h-32 pointer-events-none">
                 <div className="absolute text-yellow-300 text-lg" style={{ '--tx': '-20px', '--ty': '-20px', animation: 'tinyStarFloat 1s ease-out infinite' } as React.CSSProperties}>✦</div>
                 <div className="absolute text-yellow-300 text-lg left-1/2" style={{ '--tx': '0px', '--ty': '-30px', animation: 'tinyStarFloat 1s ease-out infinite 0.2s' } as React.CSSProperties}>✦</div>
                 <div className="absolute text-yellow-300 text-lg right-0" style={{ '--tx': '20px', '--ty': '-20px', animation: 'tinyStarFloat 1s ease-out infinite 0.4s' } as React.CSSProperties}>✦</div>
               </div>
            )}
          </AnimatePresence>


          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl overflow-visible">

              {/* Back Arm (Left Arm) */}
              <g style={{ transformOrigin: '70px 90px', animation: leftArmAnimation, willChange: 'transform' }}>
                <path d="M 70 90 L 40 110" stroke="#e4e4e7" strokeWidth="18" strokeLinecap="round" />
                <path d="M 40 105 L 45 115" stroke="#f97316" strokeWidth="6" strokeLinecap="round" />
                <circle cx="35" cy="115" r="8" fill="#f97316" />
              </g>

              {/* Back Leg (Left Leg) */}
              <g style={{ transformOrigin: '85px 140px', animation: leftLegAnimation, willChange: 'transform' }}>
                <path d="M 85 140 L 75 170" stroke="#e4e4e7" strokeWidth="22" strokeLinecap="round" />
                <path d="M 70 160 L 80 165" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
                <path d="M 75 170 L 65 185 L 85 180 Z" fill="#7e22ce" />
              </g>

              {/* Body */}
              <rect x="70" y="80" width="60" height="70" rx="30" fill="#f4f4f5" />
              <path d="M 80 80 Q 100 150 120 80 Z" fill="#e4e4e7" opacity="0.5" />
              <circle cx="100" cy="110" r="10" fill="#f97316" />
              <circle cx="100" cy="110" r="6" fill="#c2410c" />

              {/* Harness/Belt */}
              <path d="M 75 130 Q 100 140 125 130" stroke="#7e22ce" strokeWidth="8" fill="none" strokeLinecap="round" />
              <path d="M 70 90 L 100 120 L 130 90" stroke="#7e22ce" strokeWidth="4" fill="none" strokeLinecap="round" />

              {/* Helmet Base (White) */}
              <circle cx="100" cy="65" r="45" fill="#ffffff" />

              {/* Ear pieces */}
              <circle cx="55" cy="70" r="12" fill="#d4d4d8" />
              <circle cx="55" cy="70" r="8" fill="#7e22ce" />
              <circle cx="145" cy="70" r="12" fill="#d4d4d8" />
              <circle cx="145" cy="70" r="8" fill="#7e22ce" />

              {/* Visor (Teal Gradient/Reflection effect) */}
              <ellipse cx="100" cy="65" rx="35" ry="30" fill="#0f766e" />
              <ellipse cx="95" cy="55" rx="20" ry="12" fill="#2dd4bf" opacity="0.8" transform="rotate(-15 95 55)" />
              <ellipse cx="115" cy="75" rx="8" ry="4" fill="#042f2e" opacity="0.6" transform="rotate(-15 115 75)" />


              {/* Front Leg (Right Leg) */}
              <g style={{ transformOrigin: '115px 140px', animation: rightLegAnimation, willChange: 'transform' }}>
                <path d="M 115 140 L 135 160" stroke="#e4e4e7" strokeWidth="22" strokeLinecap="round" />
                <path d="M 125 155 L 140 150" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
                <path d="M 135 160 L 145 175 L 125 170 Z" fill="#7e22ce" />
              </g>

              {/* Front Arm (Right Arm) */}
              <g style={{ transformOrigin: '130px 90px', animation: rightArmAnimation, willChange: 'transform' }}>
                <path d="M 130 90 L 160 80" stroke="#e4e4e7" strokeWidth="18" strokeLinecap="round" />
                <path d="M 155 75 L 165 85" stroke="#f97316" strokeWidth="6" strokeLinecap="round" />
                <circle cx="170" cy="75" r="8" fill="#f97316" />
              </g>

              {/* Tired Effects */}
              {!shouldReduceMotion && mascotState === 'tired' && (
                <>
                  <g className="animate-bounce">
                    <path d="M 130 50 Q 135 60 130 65 Q 125 60 130 50 Z" fill="#38bdf8" opacity="0.8" />
                    <path d="M 145 40 Q 148 48 145 52 Q 142 48 145 40 Z" fill="#38bdf8" opacity="0.6" />
                  </g>
                  {/* Breath line */}
                  <path d="M 140 75 Q 160 85 180 75" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" className="animate-pulse" />
                </>
              )}
            </svg>
        </div>
      </div>
    </div>
  )
}
