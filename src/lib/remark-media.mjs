const escapeAttribute = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character])

export default function remarkMedia() {
  return tree => {
    const definitions = new Map()
    function collect(node) {
      if (node.type === 'definition' && !definitions.has(node.identifier)) {
        definitions.set(node.identifier, node)
      }
      node.children?.forEach(collect)
    }
    collect(tree)

    function visit(node) {
      const source = node.type === 'image' ? node
        : node.type === 'imageReference' ? definitions.get(node.identifier) : null
      const extension = source && new URL(source.url, 'https://media.invalid').pathname
        .match(/\.(apng|gif|webp|mp4|m4v|webm|ogv|ogg)$/i)?.[1].toLowerCase()
      if (extension && !/^(?:https?:\/\/|\/)/i.test(source.url)) {
        if (!['gif', 'webp'].includes(extension)) {
          throw new Error(`Media "${source.url}": put the file in public/ and use a root-relative URL, or use an HTTP(S) URL.`)
        }
      } else if (extension) {
        const src = escapeAttribute(source.url)
        const alt = escapeAttribute(node.alt ?? '')
        const title = source.title == null ? '' : ` title="${escapeAttribute(source.title)}"`
        node.type = 'html'
        node.value = ['apng', 'gif', 'webp'].includes(extension)
          ? `<img src="${src}" alt="${alt}"${title} loading="lazy" decoding="async">`
          : `<video src="${src}" aria-label="${alt || 'Video'}"${title} controls playsinline preload="metadata"></video>`
      }
      node.children?.forEach(visit)
    }
    visit(tree)
  }
}
