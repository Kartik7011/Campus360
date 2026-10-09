import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

// Follow real time even when frames are sparse (slow devices, throttled tabs) so content never stays hidden.
gsap.ticker.lagSmoothing(0)

// Fades the top-level blocks inside the returned ref up into place whenever `key` changes.
export function useEnterAnimation<T extends HTMLElement>(key: string, selector = ':scope > * > *') {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    if (!ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.from(selector, {
        opacity: 0,
        y: 12,
        duration: 0.35,
        ease: 'power1.out',
        stagger: 0.05,
        clearProps: 'opacity,transform',
      })
    }, ref)
    return () => ctx.revert()
  }, [key, selector])

  return ref
}
