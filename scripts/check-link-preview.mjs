import assert from 'node:assert/strict'
import { getLinkPreview, parseLinkPreview } from '../src/lib/link-preview.mjs'

const preview = parseLinkPreview(`<title>Plain title</title><meta content="A &amp; B" property="og:title"><meta name="description" content="Plain description"><meta content="OG description" property="og:description"><meta property="og:image" content="../cover.png"><meta property="og:title" content="Later title">`, 'https://example.org/path/page')
assert.deepEqual(preview, { title: 'A & B', description: 'OG description', image: 'https://example.org/cover.png' })
assert.deepEqual(parseLinkPreview('<title>A &lt; B</title><meta name="twitter:description" content="Tweet"><meta name="twitter:image" content="javascript:alert(1)">', 'https://example.org'), { title: 'A < B', description: 'Tweet', image: '' })
await assert.rejects(() => getLinkPreview('file:///etc/passwd'), /HTTP/)
await assert.rejects(() => getLinkPreview('https://user:password@example.org'), /credential/)
for (const url of ['http://127.0.0.1/', 'http://10.0.0.1/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/']) {
  const warnings = []
  const warn = console.warn
  console.warn = text => warnings.push(text)
  try {
    const result = await getLinkPreview(url)
    assert.equal(result.title, '')
    assert.equal(result.url, new URL(url).href)
    assert(warnings.some(text => text.includes('Private or reserved address rejected')))
  } finally { console.warn = warn }
}
console.log('Link preview metadata and private-address checks passed.')
