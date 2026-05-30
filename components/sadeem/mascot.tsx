"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useAnimation } from "framer-motion"

export function Mascot({ currentTab }: { currentTab: string }) {
  const [isWaving, setIsWaving] = useState(false)
  const [isFlying, setIsFlying] = useState(false)
  const prevTab = useRef(currentTab)

  const controls = useAnimation()

  useEffect(() => {
    if (prevTab.current !== currentTab) {
      setIsFlying(true)

      const fly = async () => {
        // Fly up and out
        await controls.start({
          x: [0, 150, 300],
          y: [0, -100, -200],
          rotate: [0, 45, 90],
          scale: [1, 0.8, 0],
          transition: { duration: 0.5, ease: "easeIn" }
        })

        // Return from left side
        await controls.start({
          x: -300,
          y: -100,
          rotate: -45,
          scale: 0,
          transition: { duration: 0 }
        })

        // Land
        await controls.start({
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          transition: { type: "spring", stiffness: 200, damping: 15 }
        })

        setIsFlying(false)
        prevTab.current = currentTab
      }

      fly()
    }
  }, [currentTab, controls])

  const handleTap = () => {
    if (isFlying) return
    setIsWaving(true)
    setTimeout(() => setIsWaving(false), 1500)
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" dir="ltr">
      <div className="absolute top-16 right-4 sm:top-8 sm:right-8 pointer-events-auto cursor-pointer" onClick={handleTap}>
        <motion.div
          animate={controls}
          initial={{ x: 0, y: 0 }}
        >
          <motion.div
            animate={
              isFlying
                ? {}
                : {
                    y: [0, -8, 0],
                    rotate: [0, -3, 3, 0]
                  }
            }
            transition={{
              y: { duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
              rotate: { duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
            }}
          >
            <MascotSVG isWaving={isWaving} />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

function MascotSVG({ isWaving }: { isWaving: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-xl filter">
      <defs>
        <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      {/* Thruster flame */}
      <motion.path
        d="M 40 85 Q 50 105 60 85 Z"
        fill="#f59e0b"
        animate={{ opacity: [0.6, 1, 0.6], scaleY: [0.8, 1.3, 0.8] }}
        transition={{ duration: 0.4, repeat: Number.POSITIVE_INFINITY }}
        style={{ transformOrigin: "50% 85%" }}
      />
      <motion.path
        d="M 45 85 Q 50 95 55 85 Z"
        fill="#fef08a"
        animate={{ opacity: [0.6, 1, 0.6], scaleY: [0.8, 1.2, 0.8] }}
        transition={{ duration: 0.2, repeat: Number.POSITIVE_INFINITY }}
        style={{ transformOrigin: "50% 85%" }}
      />

      {/* Backpack */}
      <rect x="25" y="30" width="50" height="40" rx="8" fill="url(#suitGrad)" stroke="#94a3b8" strokeWidth="2" />

      {/* Body */}
      <path d="M 32 40 Q 50 35 68 40 L 65 75 Q 50 80 35 75 Z" fill="url(#suitGrad)" stroke="#94a3b8" strokeWidth="2" />

      {/* Helmet Base */}
      <circle cx="50" cy="35" r="22" fill="url(#suitGrad)" stroke="#94a3b8" strokeWidth="2" />

      {/* Ear pieces */}
      <rect x="24" y="30" width="6" height="10" rx="2" fill="url(#accentGrad)" />
      <rect x="70" y="30" width="6" height="10" rx="2" fill="url(#accentGrad)" />

      {/* Visor */}
      <circle cx="50" cy="35" r="16" fill="url(#visorGrad)" stroke="#475569" strokeWidth="1.5" />
      {/* Visor reflection */}
      <path d="M 38 28 Q 50 20 60 28" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Cute glowing eyes */}
      <circle cx="44" cy="35" r="2.5" fill="#60a5fa" />
      <circle cx="56" cy="35" r="2.5" fill="#60a5fa" />

      {/* Controls on chest */}
      <rect x="42" y="50" width="16" height="12" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="46" cy="56" r="2" fill="#ef4444" />
      <circle cx="54" cy="56" r="2" fill="#3b82f6" />

      {/* Legs */}
      <rect x="38" y="75" width="10" height="12" rx="4" fill="url(#suitGrad)" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="52" y="75" width="10" height="12" rx="4" fill="url(#suitGrad)" stroke="#94a3b8" strokeWidth="1.5" />

      {/* Left Arm */}
      <g transform="rotate(20 30 50)">
        <rect x="22" y="50" width="10" height="20" rx="5" fill="url(#suitGrad)" stroke="#94a3b8" strokeWidth="1.5" />
      </g>

      {/* Right Arm (Waving part) */}
      <motion.g
        style={{ transformOrigin: "70px 50px" }}
        animate={isWaving ? { rotate: [0, -40, 20, -40, 0] } : { rotate: -20 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      >
        <rect x="68" y="50" width="10" height="20" rx="5" fill="url(#suitGrad)" stroke="#94a3b8" strokeWidth="1.5" />
      </motion.g>

      {/* Stars/Sparkles */}
      <motion.circle cx="15" cy="20" r="2" fill="#fcd34d" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }} />
      <motion.circle cx="85" cy="25" r="1.5" fill="#fcd34d" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.5 }} />
      <motion.circle cx="20" cy="80" r="1" fill="#fcd34d" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY, delay: 1 }} />
    </svg>
  )
}
