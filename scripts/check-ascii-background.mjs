import { createApp, h, nextTick, reactive } from 'vue'
import AsciiBackground from '../src/components/AsciiBackground.vue'

export async function checkAsciiBackground() {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  await document.fonts.ready
  const originalRAF = window.requestAnimationFrame
  const originalCancel = window.cancelAnimationFrame
  const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
  const queue = new Map()
  let id = 0
  window.requestAnimationFrame = callback => { queue.set(++id, callback); return id }
  window.cancelAnimationFrame = handle => queue.delete(handle)
  const advance = time => {
    const callbacks = [...queue.values()]
    queue.clear()
    callbacks.forEach(callback => callback(time))
  }
  const setHidden = value => {
    Object.defineProperty(document, 'hidden', { configurable: true, value })
    document.dispatchEvent(new Event('visibilitychange'))
  }
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;inset:0 auto auto 0;width:800px;height:600px;visibility:hidden;pointer-events:none'
  document.body.append(host)
  const props = reactive({ pause: false, style: { position: 'absolute', inset: '0' } })
  let app
  try {
    setHidden(false)
    app = createApp({ render: () => h(AsciiBackground, props) })
    app.mount(host)
    await new Promise(resolve => setTimeout(resolve, 100))
    const pre = host.querySelector('pre')
    const text = () => pre.textContent
    const count = () => text().replace(/\s/g, '').length
    advance(0)
    const first = text()
    const initialCount = count()
    advance(49)
    assert(text() === first, 'Must not update before the 50ms frame interval')
    advance(1000)
    const middleCount = count()
    advance(2000)
    assert(initialCount < middleCount && middleCount < count(), 'Density must ramp over two seconds')
    assert(/^[ .:\-=+*#%@\n]+$/.test(text()), 'Only brightness-ramp characters may render')
    const beforePointer = text()
    advance(2050)
    const withoutPointer = text()
    advance(3650)
    const afterRipple = text()
    props.pause = true
    await nextTick()
    props.pause = false
    await nextTick()
    advance(0)
    advance(2000)
    assert(text() === beforePointer, 'Replaying the same time must reproduce the field')

    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 780, clientY: 100 }))
    advance(2050)
    const movingPointer = text()
    assert(movingPointer !== withoutPointer, 'Pointer input must change the field at identical simulated time')
    advance(2100)
    assert(text() !== movingPointer, 'Pointer influence must ease across frames')

    props.pause = true
    await nextTick()
    props.pause = false
    await nextTick()
    advance(0)
    advance(2000)
    window.dispatchEvent(new MouseEvent('click', { clientX: 400, clientY: 300 }))
    advance(2050)
    assert(text() !== withoutPointer, 'Click must create a ripple independently of hover')
    advance(3650)
    assert(text() === afterRipple, 'Click ripples must expire without leaving residual changes')

    setHidden(true)
    const hiddenText = text()
    advance(4000)
    assert(text() === hiddenText, 'Hidden tabs must not update text')
    setHidden(false)
    advance(5000)
    assert(text() === hiddenText, 'Returning tabs must not jump ahead by hidden time')
    advance(5050)
    assert(text() !== hiddenText, 'Returning tabs must resume animation')

    props.pause = true
    await nextTick()
    const paused = text()
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 0 }))
    window.dispatchEvent(new MouseEvent('click', { clientX: 400, clientY: 300 }))
    advance(6000)
    advance(7000)
    assert(text() === paused, 'Paused frames must ignore time, pointer, and click input')
    props.pause = false
    await nextTick()
    advance(8000)
    advance(10000)
    props.pause = true
    await nextTick()
    assert(text() === paused, 'Static first frames must be deterministic')

    const columns = text().split('\n')[0].length
    host.style.width = '320px'
    await new Promise(resolve => setTimeout(resolve, 100))
    assert(text().split('\n')[0].length < columns, 'Resize must recompute the grid while paused')
    app.unmount()
    assert(text() === '', 'Unmount must clear generated text')
    advance(11000)
    setHidden(false)
    advance(12000)
    assert(text() === '', 'Unmounted renderers must stay stopped')
    return 'PASS: density, frame cap, hover, click ripple and expiry, visibility, pause, deterministic frame, resize, unmount'
  } finally {
    if (host.firstChild) app?.unmount()
    host.remove()
    window.requestAnimationFrame = originalRAF
    window.cancelAnimationFrame = originalCancel
    if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor)
    else delete document.hidden
    document.dispatchEvent(new Event('visibilitychange'))
  }
}
