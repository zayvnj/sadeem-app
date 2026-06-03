'use client'

import { motion } from 'framer-motion';

export function AstronautMascot({ activeTab, tabsKeys, dark }: { activeTab: string, tabsKeys: string[], dark?: boolean }) {
  return (
    <div
      id="mascot-container"
      className="absolute left-0 right-0 pointer-events-none z-[200] flex justify-center items-end w-full"
      style={{ bottom: 'calc(100% - 2px)' }}
    >
      <motion.div
        animate={{
          y: [-5, 5, -5],
          x: [-60, 60, -60]
        }}
        transition={{
          y: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          },
          x: {
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}<
      >
        <
      </motion.div>
    </div>
  )
}
