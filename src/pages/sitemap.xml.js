import { getCollection } from 'astro:content'
import { sitePath } from '@/lib/site-path'

export async function GET({ site }) {
  const entries = await getCollection('journal')
  const paths = ['/', '/about/', '/contact/', '/journal/', '/projects/', '/notes/', ...entries.map((entry) => `/journal/${entry.id}/`)]
  const urls = paths.map((path) => {
    const location = new URL(sitePath(path), site).href.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<url><loc>${location}</loc></url>`
  }).join('')

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
