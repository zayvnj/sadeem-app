'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

type MascotState = 'WALK' | 'LEAN' | 'SIT';

export function AstronautMascot({ activeTab, tabsKeys, dark }: { activeTab: string, tabsKeys: string[], dark?: boolean }) {
  const [mascotState, setMascotState] = useState<MascotState>('WALK');
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const mainControls = useAnimation();
  const legLeftControls = useAnimation();
  const legRightControls = useAnimation();
  const armLeftControls = useAnimation();
  const armRightControls = useAnimation();
  const torsoControls = useAnimation();
  const headControls = useAnimation();

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }

    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const runStateMachine = () => {
      if (mascotState === 'WALK') {
        timeout = setTimeout(() => setMascotState('LEAN'), 15000);
      } else if (mascotState === 'LEAN') {
        timeout = setTimeout(() => setMascotState('SIT'), 5000);
      } else if (mascotState === 'SIT') {
        timeout = setTimeout(() => setMascotState('WALK'), 10000);
      }
    };

    runStateMachine();
    return () => clearTimeout(timeout);
  }, [mascotState]);

  useEffect(() => {
    if (!containerWidth) return;

    const runAnimations = async () => {
      const halfWidth = containerWidth / 2 - 25; // 25 is half the mascot width

      if (mascotState === 'WALK') {
        // Reset posture for walking
        torsoControls.start({ rotate: 0 });
        headControls.start({ rotate: 0, transition: { type: 'spring', stiffness: 100 } });

        // Walking limb animation loops
        legLeftControls.start({
          rotate: [0, -30, 0, 30, 0],
          transition: { repeat: Infinity, duration: 1, ease: 'linear' }
        });
        legRightControls.start({
          rotate: [0, 30, 0, -30, 0],
          transition: { repeat: Infinity, duration: 1, ease: 'linear' }
        });
        armLeftControls.start({
          rotate: [0, 30, 0, -30, 0],
          transition: { repeat: Infinity, duration: 1, ease: 'linear' }
        });
        armRightControls.start({
          rotate: [0, -30, 0, 30, 0],
          transition: { repeat: Infinity, duration: 1, ease: 'linear' }
        });

        // Walking movement loop across the container X-axis
        mainControls.start({
          x: [-halfWidth, halfWidth, -halfWidth],
          scaleX: [1, 1, -1, -1, 1], // Flip direction when walking back
          y: 0, // Reset Y from previous SIT state
          transition: {
            x: { repeat: Infinity, duration: 15, ease: 'linear' },
            scaleX: { repeat: Infinity, duration: 15, times: [0, 0.49, 0.5, 0.99, 1] }
          }
        });

      } else if (mascotState === 'LEAN') {
        // Stop the limbs
        legLeftControls.stop();
        legRightControls.stop();
        armLeftControls.stop();
        armRightControls.stop();
        mainControls.stop();

        // Animate to lean posture
        legLeftControls.start({ rotate: 0, transition: { type: 'spring' } });
        legRightControls.start({ rotate: 10, transition: { type: 'spring' } });
        armLeftControls.start({ rotate: -20, transition: { type: 'spring' } });
        armRightControls.start({ rotate: 20, transition: { type: 'spring' } });

        torsoControls.start({ rotate: 15, transition: { type: 'spring', stiffness: 50 } });
        headControls.start({ rotate: -15, transition: { type: 'spring', stiffness: 50, delay: 0.2 } });

      } else if (mascotState === 'SIT') {
        // Move to center, face forward
        mainControls.start({
          x: 0,
          scaleX: 1,
          y: 20, // Move down slightly to sit on the bar
          transition: { type: 'spring', stiffness: 100, damping: 20 }
        });

        torsoControls.start({ rotate: 0, transition: { type: 'spring' } });
        headControls.start({ rotate: 0, transition: { type: 'spring' } });

        // Adjust arms
        armLeftControls.start({ rotate: 0, transition: { type: 'spring' } });
        armRightControls.start({ rotate: 0, transition: { type: 'spring' } });

        // Legs sit & kick animation
        legLeftControls.start({
          rotate: [-70, -40, -70, -40, -70], // dangling/kicking rotation
          transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' }
        });
        legRightControls.start({
          rotate: [-40, -70, -40, -70, -40], // alternating kick
          transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' }
        });
      }
    };

    runAnimations();

  }, [mascotState, containerWidth, mainControls, legLeftControls, legRightControls, armLeftControls, armRightControls, torsoControls, headControls]);

  return (
    <div
      id="mascot-container"
      ref={containerRef}
      className="absolute left-0 right-0 pointer-events-none z-[200] flex justify-center w-full overflow-visible"
      style={{ bottom: '100%', height: '60px' }}
    >
      <motion.div animate={mainControls} className="absolute bottom-0 w-[50px] h-[60px]" style={{ transformOrigin: 'bottom center' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" overflow="visible">

          <motion.g id="legs" style={{ transformOrigin: '50px 75px' }}>
            <motion.g id="leg-left" animate={legLeftControls} style={{ transformOrigin: '40px 75px' }}>
              <rect x="35" y="75" width="10" height="25" rx="5" fill="#e2e8f0" />
              <rect x="32" y="95" width="16" height="8" rx="4" fill="#94a3b8" />
            </motion.g>
            <motion.g id="leg-right" animate={legRightControls} style={{ transformOrigin: '60px 75px' }}>
              <rect x="55" y="75" width="10" height="25" rx="5" fill="#e2e8f0" />
              <rect x="52" y="95" width="16" height="8" rx="4" fill="#94a3b8" />
            </motion.g>
          </motion.g>

          <motion.g id="arms" style={{ transformOrigin: '50px 45px' }}>
            <motion.g id="arm-left" animate={armLeftControls} style={{ transformOrigin: '30px 45px' }}>
              <rect x="20" y="45" width="12" height="30" rx="6" fill="#e2e8f0" />
            </motion.g>
            <motion.g id="arm-right" animate={armRightControls} style={{ transformOrigin: '70px 45px' }}>
              <rect x="68" y="45" width="12" height="30" rx="6" fill="#e2e8f0" />
            </motion.g>
          </motion.g>

          <motion.g id="torso" animate={torsoControls} style={{ transformOrigin: '50px 75px' }}>
            <rect x="25" y="35" width="50" height="45" rx="8" fill="#cbd5e1" />
            <rect x="30" y="40" width="40" height="40" rx="15" fill="#f8fafc" />
            <rect x="40" y="50" width="20" height="15" rx="4" fill="#e2e8f0" />
            <circle cx="45" cy="57" r="2" fill="#ef4444" />
            <circle cx="55" cy="57" r="2" fill="#3b82f6" />
          </motion.g>

          <motion.g id="head" animate={headControls} style={{ transformOrigin: '50px 40px' }}>
            <circle cx="50" cy="25" r="20" fill="#f8fafc" />
            <rect x="35" y="15" width="30" height="18" rx="9" fill="#0f172a" />
            <path d="M 38 20 Q 50 15 62 20 Q 50 25 38 20" fill="#334155" opacity="0.6" />
            <rect x="65" y="5" width="2" height="15" fill="#94a3b8" />
            <circle cx="66" cy="5" r="3" fill="#ef4444" />
          </motion.g>

        </svg>
      </motion.div>
    </div>
  );
}
