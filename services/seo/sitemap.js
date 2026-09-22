const db = require('../../database/db');
const categories = require('../../config/categories');
const limits = require('../../config/limits');

class SitemapGenerator {
  generateXml(baseUrl = 'http://localhost:3000') {
    const posts = db.all("SELECT slug, updated_at, created_at FROM posts WHERE status = 'published' ORDER BY id DESC");

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    // Homepage
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>hourly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    // Category Pages
    for (const cat of categories) {
      xml += `  <url>\n    <loc>${baseUrl}/category/${cat.slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    // Static Legal Pages
    const legalPages = ['privacy', 'terms', 'about', 'contact', 'disclaimer'];
    for (const page of legalPages) {
      xml += `  <url>\n    <loc>${baseUrl}/${page}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
    }

    // Article URLs with Hreflang alternates
    for (const post of posts) {
      const date = post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/post/${post.slug}</loc>\n`;
      xml += `    <lastmod>${date}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;

      // Alternates for multi-language
      for (const lang of limits.languages) {
        const langUrl = `${baseUrl}${lang.code === 'en' ? '' : '/' + lang.code}/post/${post.slug}`;
        xml += `    <xhtml:link rel="alternate" hreflang="${lang.code}" href="${langUrl}" />\n`;
      }

      xml += `  </url>\n`;
    }

    xml += '</urlset>';
    return xml;
  }

  generateRobots(baseUrl = 'http://localhost:3000') {
    return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
  }
}

module.exports = new SitemapGenerator();
