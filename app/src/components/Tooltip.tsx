import { useState, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Tooltip with a small open delay so quick mouse-overs don't flash it. Uses
// theme vars (not a hardcoded gray) so it adapts across light/dark/glass themes.
export default function Tooltip({ text, children, side = 'bottom' }: { text: string; children: ReactNode; side?: 'bottom' | 'top' }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(true), 250)
  }
  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    setOpen(false)
  }
  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onMouseDown={hide}>
      {children}
      {open && (
        <div className={cn(
          'absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-[10px] leading-tight whitespace-nowrap pointer-events-none z-50 shadow-lg animate-blur-fade',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )} style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          {text}
        </div>
      )}
    </div>
  )
}
