const limits = require('../../config/limits');

class SeoMetadata {
  generateMeta(post, baseUrl = 'http://localhost:3000', currentLang = 'en') {
    const siteName = 'Tech AI Zone';
    const categorySlug = (post.category || 'AI Tools').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const categoryUrl = `${baseUrl}/category/${categorySlug}`;
    const postUrl = `${baseUrl}${currentLang === 'en' ? '' : '/' + currentLang}/post/${post.slug}`;
    const imageUrl = post.featured_image || `${baseUrl}/assets/og-default.png`;
    const title = post.title.includes(siteName) ? post.title : `${post.title} | ${siteName}`;
    const description = post.meta_description || post.summary || 'In-depth benchmark analysis, architecture breakdown, and verified insights.';

    // Extract word count
    const wordCount = post.content ? post.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length : 1200;

    // Extract FAQs for Google FAQPage Schema
    const faqs = [];
    if (post.content) {
      const faqRegex = /<h3[^>]*class=["']faq-question["'][^>]*>(.*?)<\/h3>\s*<p[^>]*class=["']faq-answer["'][^>]*>(.*?)<\/p>/gis;
      let m;
      while ((m = faqRegex.exec(post.content)) !== null) {
        const q = m[1].replace(/<[^>]*>/g, '').trim();
        const a = m[2].replace(/<[^>]*>/g, '').trim();
        if (q && a) {
          faqs.push({ q, a });
        }
      }
    }

    // 1. TechArticle Schema
    const articleEntity = {
      "@type": "TechArticle",
      "@id": `${postUrl}#article`,
      "isPartOf": {
        "@type": "WebPage",
        "@id": postUrl
      },
      "headline": post.title,
      "description": description,
      "image": [imageUrl],
      "inLanguage": "en-US",
      "datePublished": post.created_at || new Date().toISOString(),
      "dateModified": post.updated_at || post.created_at || new Date().toISOString(),
      "articleSection": post.category || "Artificial Intelligence",
      "wordCount": wordCount,
      "proficiencyLevel": "Expert",
      "author": {
        "@type": "Organization",
        "name": "Tech AI Zone Research Intelligence",
        "url": baseUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/assets/logo.png`
        }
      },
      "publisher": {
        "@type": "Organization",
        "name": siteName,
        "url": baseUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/assets/logo.png`
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": postUrl
      }
    };

    // 2. BreadcrumbList Schema
    const breadcrumbEntity = {
      "@type": "BreadcrumbList",
      "@id": `${postUrl}#breadcrumb`,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": baseUrl
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": post.category || "AI Tools",
          "item": categoryUrl
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": post.title,
          "item": postUrl
        }
      ]
    };

    const graph = [articleEntity, breadcrumbEntity];

    // 3. FAQPage Schema (Targets Google SERP Question Snippets)
    if (faqs.length > 0) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${postUrl}#faq`,
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": f.a
          }
        }))
      });
    }

    const schemaJson = {
      "@context": "https://schema.org",
      "@graph": graph
    };

    return {
      title,
      description,
      canonicalUrl: postUrl,
      imageUrl,
      ogType: 'article',
      schemaJsonLd: JSON.stringify(schemaJson, null, 2)
    };
  }
}

module.exports = new SeoMetadata();
