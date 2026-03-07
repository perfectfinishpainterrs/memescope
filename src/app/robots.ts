import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard', '/alerts'] },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'https://memescope.app'}/sitemap.xml`,
  }
}
