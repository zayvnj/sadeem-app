'use client'

export function AstronautMascot({ activeTab, tabsKeys, dark }: { activeTab: string, tabsKeys: string[], dark?: boolean }) {
  return (
    <div
      id="mascot-container"
      className="absolute left-0 right-0 pointer-events-none z-[200] flex justify-center items-end bg-red-500/20 w-full"
      style={{ bottom: 'calc(100% - 2px)' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 736 736" className="w-16 h-16">
        {/* I WILL PASTE THE VTRACER PATHS HERE */}
      </svg>
    </div>
  )
}
