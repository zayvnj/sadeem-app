import { motion } from "framer-motion"
import { Logo } from "./logo"

export function GlobalLoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#030305]"
    >
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      >
        <Logo className="text-6xl md:text-8xl" />
      </motion.div>
    </motion.div>
  )
}
