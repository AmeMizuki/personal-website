import { lookup } from 'node:dns/promises'
import { isIP, BlockList } from 'node:net'
import http from 'node:http'
import https from 'node:https'
import { parse } from 'parse5'

const blocked = new BlockList()
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16], ['192.0.0.0', 24], ['192.0.2.0', 24], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]]) blocked.addSubnet(address, prefix, 'ipv4')
for (const [address, prefix] of [['::', 96], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32], ['2002::', 16]]) blocked.addSubnet(address, prefix, 'ipv6')
blocked.addAddress('::1', 'ipv6')

function httpUrl(value, base) {
  const url = new URL(value, base)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Only credential-free HTTP(S) URLs are supported')
  return url
}

export function parseLinkPreview(html, pageUrl) {
  const meta = new Map()
  let title = ''
  function visit(node) {
    if (node.tagName === 'meta') {
      const attrs = Object.fromEntries(node.attrs.map(attr => [attr.name, attr.value]))
      const key = (attrs.property || attrs.name || '').toLowerCase()
      if (attrs.content && !meta.has(key)) meta.set(key, attrs.content.trim())
    }
    if (node.tagName === 'title') title = node.childNodes.map(child => child.value || '').join('').trim()
    node.childNodes?.forEach(visit)
  }
  visit(parse(html))
  let image = ''
  const imageValue = meta.get('og:image') || meta.get('twitter:image')
  if (imageValue) {
    try { image = httpUrl(imageValue, pageUrl).href } catch { /* Invalid image URLs are not embedded. */ }
  }
  return {
    title: meta.get('og:title') || meta.get('twitter:title') || title,
    description: meta.get('og:description') || meta.get('twitter:description') || meta.get('description') || '',
    image,
  }
}

async function requestPage(url, signal) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname, { all: true })
  if (!addresses.length || addresses.some(({ address, family }) =>
    (family === 6 && !/^[23][0-9a-f]{3}:/i.test(address)) || blocked.check(address, family === 6 ? 'ipv6' : 'ipv4')
  )) throw new Error('Private or reserved address rejected')
  signal.throwIfAborted()
  const target = addresses[0]
  // Pin the checked IP so a second DNS lookup cannot redirect the request internally.
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).get(url, {
      signal,
      lookup: (_host, options, callback) => callback(null, options.all ? [target] : target.address, target.family),
      headers: { Accept: 'text/html', 'User-Agent': 'ProjectLinkPreview/1.0' },
    }, response => {
      const status = response.statusCode
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.destroy()
        resolve({ redirect: response.headers.location })
        return
      }
      if (status < 200 || status >= 300 || !/\btext\/html\b|\bapplication\/xhtml\+xml\b/i.test(response.headers['content-type'] || '')) {
        response.destroy()
        reject(new Error(`Not an HTML success response (${status})`))
        return
      }
      const chunks = []
      let size = 0
      response.on('data', chunk => {
        size += chunk.length
        if (size > 1024 * 1024) {
          response.destroy(new Error('HTML exceeds 1 MiB'))
          return
        }
        chunks.push(chunk)
      })
      response.on('error', reject)
      response.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }))
    })
    request.on('error', reject)
  })
}

export async function getLinkPreview(value) {
  const original = httpUrl(value)
  const result = { url: original.href, hostname: original.hostname, title: '', description: '', image: '' }
  try {
    const signal = AbortSignal.timeout(6000)
    let url = original
    for (let redirects = 0; redirects <= 3; redirects++) {
      const response = await requestPage(url, signal)
      if (response.redirect) {
        url = httpUrl(response.redirect, url)
        continue
      }
      return { ...result, ...parseLinkPreview(response.html, url.href) }
    }
    throw new Error('Too many redirects')
  } catch (error) {
    console.warn(`[link-preview] ${original.href}: ${error.message}`)
    return result
  }
}
