import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'

gsap.registerPlugin(Flip)

// Animates the <article> cards inside the returned ref whenever `filterKey` changes:
// cards that stay slide to their new place, new cards fade in.
export function useFlipList<T extends HTMLElement>(filterKey: string) {
  const ref = useRef<T>(null)
  const lastState = useRef<Flip.FlipState | null>(null)
  const lastKey = useRef(filterKey)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const cards = el.querySelectorAll(':scope > article')
    const previous = lastState.current
    // snapshot the settled layout before Flip moves anything, so the next change starts from here
    lastState.current = Flip.getState(cards)
    const changed = lastKey.current !== filterKey
    lastKey.current = filterKey
    if (!previous || !changed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const animation = Flip.from(previous, {
      targets: cards,
      duration: 0.4,
      ease: 'power2.inOut',
      onEnter: (entering) =>
        gsap.fromTo(entering, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3 }),
    })
    return () => {
      animation.progress(1).kill()
    }
  })

  return ref
}
