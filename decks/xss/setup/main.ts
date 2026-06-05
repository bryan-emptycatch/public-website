import { defineAppSetup } from '@slidev/types'

export default defineAppSetup(() => {
  let advancing = false

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    if (advancing) { advancing = false; return }

    const target = e.target as HTMLElement
    if (target.closest('a, button, input, textarea, select, [contenteditable], .slidev-nav, .slidev-icon-btn, .slidev-drawing')) return

    const container = document.getElementById('slide-container')
    if (!container || !container.contains(target)) return

    e.stopPropagation()

    advancing = true
    container.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0,
      bubbles: true,
      cancelable: true,
      clientX: window.innerWidth * 0.75,
      pageX: window.innerWidth * 0.75,
      clientY: e.clientY,
      pageY: e.pageY,
    }))
  }, { capture: true })
})