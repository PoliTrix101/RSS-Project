// Small motion helpers shared by the sign-in and registration pages.

export function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

// True on devices with a mouse or trackpad. Used to decide whether to
// auto-focus a field: on phones that would pop the keyboard open unasked.
export function hasFinePointer() {
  return typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(pointer: fine)').matches)
}

// Shake an element sideways, e.g. a form that failed validation. Uses the
// Web Animations API so it can be retriggered without toggling classes.
export function shake(element) {
  if (!element?.animate || prefersReducedMotion()) return

  element.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-9px)' },
      { transform: 'translateX(8px)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(-2px)' },
      { transform: 'translateX(0)' }
    ],
    { duration: 460, easing: 'cubic-bezier(.36, .07, .19, .97)' }
  )
}

export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
