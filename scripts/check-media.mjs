import assert from 'node:assert/strict'
import { createMarkdownProcessor } from '@astrojs/markdown-remark'
import { parseFragment } from 'parse5'
import remarkMedia from '../src/lib/remark-media.mjs'

const processor = await createMarkdownProcessor({ remarkPlugins: [remarkMedia] })
const render = markdown => processor.render(markdown, { fileURL: new URL('../src/content/journal/check.md', import.meta.url) })
function element(code, tagName) {
  function find(node) {
    if (node.tagName === tagName) return node
    return node.childNodes?.map(find).find(Boolean)
  }
  return find(parseFragment(code))
}
const attributes = node => Object.fromEntries(node.attrs.map(({ name, value }) => [name, value]))

for (const extension of ['apng', 'gif', 'webp']) {
  const url = `/media/animation.${extension}?v=1&size=large#frame`
  const { code, metadata } = await render(`![動畫](${url})`)
  const image = attributes(element(code, 'img'))
  assert.equal(image.src, url, 'Animation must keep the original asset URL')
  assert.equal(image.alt, '動畫', 'Image descriptions must survive rendering')
  assert.deepEqual(metadata.localImagePaths, [], 'Animated assets must bypass image conversion')
}

for (const extension of ['mp4', 'm4v', 'webm', 'ogv', 'ogg']) {
  const { code } = await render(`![影片][clip]\n\n[clip]: https://example.com/demo.${extension.toUpperCase()}?v=1 "示範"`)
  const player = element(code, 'video')
  assert.ok(player, 'Video references must render as a player, not a broken image')
  const video = attributes(player)
  assert.ok('controls' in video && 'playsinline' in video, 'Playback must remain user-controlled')
  assert.equal(video['aria-label'], '影片', 'Players must retain their accessible description')
  assert.ok(!('autoplay' in video), 'Videos must not start without user input')
}

const { code: escaped } = await render('![\" onerror=\"alert(1)](/media/demo.mp4)')
assert.ok(!('onerror' in attributes(element(escaped, 'video'))), 'Descriptions must not inject HTML attributes')
const { code: ordinary } = await render('[download](/media/demo.mp4)\n\n![photo](/media/photo.jpg)')
assert.equal(attributes(element(ordinary, 'a')).href, '/media/demo.mp4', 'Ordinary video links must remain links')
assert.equal(attributes(element(ordinary, 'img')).src, '/media/photo.jpg', 'Static images must retain normal Markdown behavior')
await assert.rejects(render('![clip](./demo.mp4)'), /put the file in public/, 'Unserved content-relative videos must produce an actionable error')
const { metadata } = await render('![animation](./demo.gif)')
assert.deepEqual(metadata.localImagePaths, ['./demo.gif'], 'Existing content-relative GIF assets must remain supported')
console.log('Media check passed: animations, video formats, references, escaping, and existing Markdown behavior')
