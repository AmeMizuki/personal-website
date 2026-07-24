import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { profile } from '@/data/profile'

export async function GET(context) {
  const entries = (await getCollection('journal')).sort((a, b) => b.data.date - a.data.date)

  return rss({
    title: `${profile.name} — journal`,
    description: `${profile.name} 的日誌`,
    site: context.site,
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.excerpt,
      pubDate: entry.data.date,
      link: `/journal/${entry.id}/`,
      categories: [entry.data.category],
    })),
  })
}
