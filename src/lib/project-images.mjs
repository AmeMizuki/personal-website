import { parseFragment } from 'parse5'

export function getProjectImages(project) {
  const images = new Map(project.data.images.map(image => [image.src, image]))
  function visit(node) {
    if (node.tagName === 'img') {
      const attrs = Object.fromEntries(node.attrs.map(({ name, value }) => [name, value]))
      const src = attrs.src ?? ''
      const isPublicPath = /^\/(?![\/\\])[^\\\s]*$/.test(src)
      let isRemote = false
      try { isRemote = ['http:', 'https:'].includes(new URL(src).protocol) } catch { /* Local paths are checked above. */ }
      if ((isPublicPath || isRemote) && !images.has(src)) images.set(src, { src, alt: attrs.alt ?? '' })
    }
    node.childNodes?.forEach(visit)
  }
  visit(parseFragment(project.rendered?.html ?? ''))
  return [...images.values()]
}
