'use client'

export function AstronautMascot({ activeTab, tabsKeys, dark }: { activeTab: string, tabsKeys: string[], dark?: boolean }) {
  return (
    <div
      id="mascot-container"
      className="absolute left-0 right-0 pointer-events-none z-[200] w-full h-0"
      style={{ bottom: 'calc(100% - 2px)' }}
    >
      {/* Raw SVG will be manually pasted here by the user */}
    </div>
  )
}
