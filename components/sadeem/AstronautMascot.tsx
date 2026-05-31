'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function AstronautMascot() {
  const [isTired, setIsTired] = useState(false)

  useEffect(() => {
    const tiredInterval = setInterval(() => {
      setIsTired(true)

      setTimeout(() => {
        setIsTired(false)
      }, 5000) // Stay tired for 5 seconds
    }, 60000) // Trigger every 60 seconds

    return () => clearInterval(tiredInterval)
  }, [])

  return (
    <div className="absolute left-0 right-0 pointer-events-none z-[100] flex w-full overflow-hidden" style={{ bottom: '100%' }}>
      <style>{`
        @keyframes roamMascot {
          0% { transform: translateX(0) scaleX(-1); }
          49% { transform: translateX(calc(-100vw + 3.5rem)) scaleX(-1); }
          50% { transform: translateX(calc(-100vw + 3.5rem)) scaleX(1); }
          99% { transform: translateX(0) scaleX(1); }
          100% { transform: translateX(0) scaleX(-1); }
        }
        @keyframes runLeftLeg {
          0%, 100% { transform: rotate(15deg); }
          50% { transform: rotate(-15deg); }
        }
        @keyframes runRightLeg {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
        }
        @keyframes spaceBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      <AnimatePresence mode="wait">
        <div
          key="mascot-container"
          className="relative w-10 h-10 sm:w-14 sm:h-14 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          style={{
            animation: 'roamMascot 12s linear infinite',
            animationPlayState: isTired ? 'paused' : 'running',
          }}
        >
          <motion.div
            key="mascot"
            animate={
              isTired
                ? { y: [0, 5, 0], rotate: [0, 10, -5, 0] }
                : { y: 0, rotate: 0 }
            }
            transition={
              isTired
                ? { repeat: Infinity, duration: 2 }
                : { duration: 0.5 }
            }
            className="w-full h-full"
            style={
              !isTired
                ? {
                    animation: 'spaceBounce 1s ease-in-out infinite',
                  }
                : {}
            }
          >
            {/* Astronaut SVG based on the provided reference image (premium style, white suit, teal visor, orange accents) */}
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
              {/* Cord / Tether */}
              <path d="M 60 140 C 20 180, -20 100, 50 110" stroke="#d4d4d8" strokeWidth="3" fill="none" strokeLinecap="round" />

              {/* Left Arm */}
              <g transform="rotate(15 60 100)">
                <path d="M 70 90 L 40 110" stroke="#e4e4e7" strokeWidth="18" strokeLinecap="round" />
                <path d="M 40 105 L 45 115" stroke="#f97316" strokeWidth="6" strokeLinecap="round" />
                <circle cx="35" cy="115" r="8" fill="#f97316" />
              </g>

              {/* Right Arm */}
              <g transform="rotate(-30 140 100)">
                <path d="M 130 90 L 160 80" stroke="#e4e4e7" strokeWidth="18" strokeLinecap="round" />
                <path d="M 155 75 L 165 85" stroke="#f97316" strokeWidth="6" strokeLinecap="round" />
                <circle cx="170" cy="75" r="8" fill="#f97316" />
              </g>

              {/* Left Leg */}
              <g style={{ transformOrigin: '85px 140px', animation: !isTired ? 'runLeftLeg 1s ease-in-out infinite' : 'none' }}>
                <path d="M 85 140 L 75 170" stroke="#e4e4e7" strokeWidth="22" strokeLinecap="round" />
                <path d="M 70 160 L 80 165" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
                <path d="M 75 170 L 65 185 L 85 180 Z" fill="#7e22ce" />
              </g>

              {/* Right Leg */}
              <g style={{ transformOrigin: '115px 140px', animation: !isTired ? 'runRightLeg 1s ease-in-out infinite' : 'none' }}>
                <path d="M 115 140 L 135 160" stroke="#e4e4e7" strokeWidth="22" strokeLinecap="round" />
                <path d="M 125 155 L 140 150" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
                <path d="M 135 160 L 145 175 L 125 170 Z" fill="#7e22ce" />
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

              {/* Motion Lines (only visible when roaming) */}
              {!isTired && (
                <g className="animate-pulse">
                  <path d="M 0 100 L 40 100" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                  <path d="M 10 70 L 30 70" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                  <path d="M 20 130 L 50 130" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                  <path d="M 30 160 L 60 160" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                </g>
              )}

              {/* Tired Sweat Drops (only visible when tired) */}
              {isTired && (
                <g className="animate-bounce">
                  <path d="M 130 50 Q 135 60 130 65 Q 125 60 130 50 Z" fill="#38bdf8" opacity="0.8" />
                  <path d="M 145 40 Q 148 48 145 52 Q 142 48 145 40 Z" fill="#38bdf8" opacity="0.6" />
                </g>
              )}
            </svg>
          </motion.div>
        </div>
      </AnimatePresence>
    </div>
  )
}
