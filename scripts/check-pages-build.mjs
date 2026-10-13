import assert from 'node:assert/strict'
import { existsSync, globSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'parse5'

const origin = new URL(process.env.SITE_URL).origin
const base = (process.env.SITE_BASE || '').replace(/\/$/, '')
const root = new URL(`${base}/`, origin)
const dist = new URL('../dist/', import.meta.url)

function checkLocalURL(value, pageURL) {
  const url = new URL(value, pageURL)
  if (url.origin !== origin) return
  assert.ok(url.pathname.startsWith(`${base}/`), `URL escapes site base: ${url}`)
  const file = join(fileURLToPath(dist), decodeURIComponent(url.pathname.slice(base.length)))
  assert.ok((existsSync(file) && statSync(file).isFile()) || existsSync(join(file, 'index.html')), `Missing output for ${url}`)
}

function inspect(node, pageURL) {
  const attrs = Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]))
  if (attrs.rel === 'canonical') assert.equal(attrs.href, pageURL.href)
  else for (const key of ['href', 'src']) {
    if (attrs[key]) checkLocalURL(attrs[key], pageURL)
  }
  for (const child of node.childNodes || []) inspect(child, pageURL)
}

for (const file of globSync('**/*.html', { cwd: dist })) {
  const pageURL = new URL(file === '404.html' ? '404/' : file.replace(/index\.html$/, ''), root)
  const document = parse(readFileSync(new URL(file, dist), 'utf8'))
  inspect(document, pageURL)
}
for (const file of ['sitemap.xml', 'rss.xml']) {
  const xml = readFileSync(new URL(file, dist), 'utf8')
  for (const match of xml.matchAll(/<(?:loc|link)>([^<]+)<\/(?:loc|link)>/g)) checkLocalURL(match[1], root)
}
assert.ok(readFileSync(new URL('robots.txt', dist), 'utf8').includes(`Sitemap: ${new URL('sitemap.xml', root).href}\n`))
console.log(`Pages build check passed: internal links, assets, canonical URLs, sitemap, RSS and robots under ${root.href}`)
