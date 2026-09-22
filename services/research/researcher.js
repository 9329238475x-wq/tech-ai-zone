const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../../database/db');

class DeepResearcher {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  }

  // Scrape page content safely
  async scrapePageContent(url) {
    if (!url || !url.startsWith('http')) return null;
    try {
      const res = await axios.get(url, {
        headers: { 
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 12000,
        maxRedirects: 5
      });

      const $ = cheerio.load(res.data);
      // Remove noise elements
      $('script, style, nav, footer, header, noscript, iframe, .ad, .ads, .sidebar, .comments, .share, .social, .related, .newsletter').remove();

      const pageTitle = $('title').text().trim() || $('h1').first().text().trim();
      
      // Extract meta description
      const metaDesc = $('meta[name="description"]').attr('content') || 
                        $('meta[property="og:description"]').attr('content') || '';

      // Extract OG image
      const ogImage = $('meta[property="og:image"]').attr('content') || '';

      // Grab meaningful paragraphs
      const paragraphs = [];
      $('article p, main p, .post-content p, .entry-content p, .article-body p, [role="main"] p, p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 40 && paragraphs.length < 25) {
          paragraphs.push(text);
        }
      });

      // Extract headings for structure
      const headings = [];
      $('article h2, article h3, main h2, main h3, .post-content h2, .post-content h3').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 5 && headings.length < 10) {
          headings.push(text);
        }
      });

      // Extract list items (specs, features)
      const listItems = [];
      $('article li, main li, .post-content li').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 20 && listItems.length < 15) {
          listItems.push(`• ${text}`);
        }
      });

      return {
        title: pageTitle,
        url,
        description: metaDesc,
        ogImage,
        content: paragraphs.join('\n\n').slice(0, 5000),
        headings: headings.join('\n'),
        keyPoints: listItems.join('\n'),
        wordCount: paragraphs.join(' ').split(/\s+/).length,
        status: 'ok'
      };
    } catch (err) {
      db.log('warn', 'DeepResearcher', `Could not scrape ${url}: ${err.message}`);
      return null;
    }
  }

  // Search Google News RSS feed for real, current news coverage
  async searchGoogleNews(query) {
    const results = [];
    try {
      const cleanQuery = query.replace(/[^\w\s.-]/g, ' ').replace(/\s+/g, ' ').trim();
      const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await axios.get(searchUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      const $ = cheerio.load(res.data, { xmlMode: true });
      $('item').slice(0, 5).each((i, el) => {
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const pubDate = $(el).find('pubDate').text().trim();
        const source = $(el).find('source').text().trim() || 'News Publication';
        const desc = $(el).find('description').text().replace(/<[^>]*>/g, '').trim();

        if (title && link) {
          results.push({
            title,
            url: link,
            sourceName: source,
            pubDate,
            snippet: desc,
            type: 'news_coverage'
          });
        }
      });
    } catch (err) {
      db.log('warn', 'DeepResearcher', `Google News search error: ${err.message}`);
    }
    return results;
  }

  // Search Hacker News Algolia API for real developer threads and direct official URLs
  async searchHackerNews(query) {
    const results = [];
    try {
      const cleanQuery = query.replace(/[^\w\s.-]/g, ' ').replace(/\s+/g, ' ').trim();
      const searchUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(cleanQuery)}&tags=story`;
      const res = await axios.get(searchUrl, { timeout: 10000 });

      if (res.data && res.data.hits) {
        for (const h of res.data.hits.slice(0, 4)) {
          if (!h.title) continue;
          
          // Direct story URL if available
          if (h.url && !h.url.includes('news.ycombinator.com')) {
            let domain = 'Official Tech Source';
            try {
              domain = new URL(h.url).hostname.replace(/^www\./, '');
            } catch (e) {}
            
            results.push({
              title: h.title,
              url: h.url,
              sourceName: domain,
              points: h.points || 0,
              numComments: h.num_comments || 0,
              type: 'official_announcement',
              snippet: `Shared on Hacker News with ${h.points || 0} points and ${h.num_comments || 0} comments.`
            });
          }

          // Also include the Hacker News discussion thread itself as community source
          results.push({
            title: `Hacker News Discussion: ${h.title} (${h.points || 0} points, ${h.num_comments || 0} comments)`,
            url: `https://news.ycombinator.com/item?id=${h.objectID}`,
            sourceName: 'Hacker News Community',
            points: h.points || 0,
            numComments: h.num_comments || 0,
            type: 'community_discussion',
            snippet: `Active developer discussion with ${h.num_comments || 0} community responses on Hacker News.`
          });
        }
      }
    } catch (err) {
      db.log('warn', 'DeepResearcher', `Hacker News search error: ${err.message}`);
    }
    return results;
  }

  // Scrape Reddit comments for community discussion context
  async scrapeRedditDiscussion(redditUrl) {
    if (!redditUrl || !redditUrl.includes('reddit.com')) return null;
    try {
      const jsonUrl = redditUrl.replace(/\/$/, '') + '.json?limit=15';
      const res = await axios.get(jsonUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      const data = res.data;
      const comments = [];
      
      const postBody = data[0]?.data?.children?.[0]?.data?.selftext || '';
      
      const commentChildren = data[1]?.data?.children || [];
      for (const c of commentChildren) {
        const body = c.data?.body;
        const score = c.data?.score || 0;
        if (body && score > 3 && body.length > 25 && comments.length < 8) {
          comments.push({
            text: body.slice(0, 500),
            score,
            author: c.data?.author || 'anonymous'
          });
        }
      }

      return {
        postBody: postBody.slice(0, 2500),
        topComments: comments,
        commentCount: commentChildren.length
      };
    } catch (err) {
      return null;
    }
  }

  async buildResearchDossier(topic) {
    db.log('info', 'DeepResearcher', `Building comprehensive multi-source dossier for: "${topic.title}"`);

    const sources = [];
    const seenUrls = new Set();

    const addSource = (s) => {
      if (!s.url || seenUrls.has(s.url)) return;
      seenUrls.add(s.url);
      sources.push({
        id: sources.length + 1,
        title: s.title,
        url: s.url,
        sourceName: s.sourceName || (s.type === 'reddit' ? 'Reddit' : 'Tech Publication'),
        type: s.type || 'technical_source',
        date: s.date || new Date().toISOString(),
        reliability: s.reliability || 88,
        snippet: s.snippet || ''
      });
    };

    let bestImageCandidate = topic.imageUrl || null;
    let scrapedContentText = '';

    // === 1. Primary Source from topic ===
    if (topic.sourceUrl && topic.sourceUrl.startsWith('http')) {
      addSource({
        title: topic.title,
        url: topic.sourceUrl,
        sourceName: topic.sourceType ? topic.sourceType.toUpperCase() : 'Primary Source',
        type: topic.sourceType || 'primary_thread',
        reliability: 90,
        snippet: topic.rawText ? topic.rawText.slice(0, 300) : ''
      });
    }

    // === 2. External Direct URL Scraping ===
    const targetUrl = topic.externalUrl || (topic.sourceUrl && !topic.sourceUrl.includes('reddit.com') ? topic.sourceUrl : null);
    if (targetUrl && targetUrl.startsWith('http')) {
      const scraped = await this.scrapePageContent(targetUrl);
      if (scraped && scraped.content && scraped.wordCount > 40) {
        addSource({
          title: scraped.title || 'Official Specification & Article',
          url: targetUrl,
          sourceName: scraped.title ? scraped.title.split(' - ')[1] || 'Official Publisher' : 'Official Publisher',
          type: 'official_announcement',
          reliability: 95,
          snippet: scraped.description || scraped.content.slice(0, 300)
        });

        scrapedContentText += `=== OFFICIAL PUBLISHED CONTENT ("${scraped.title}") ===\n`;
        if (scraped.description) scrapedContentText += `SUMMARY: ${scraped.description}\n`;
        if (scraped.headings) scrapedContentText += `KEY SECTIONS:\n${scraped.headings}\n`;
        scrapedContentText += `FULL TEXT EXCERPT:\n${scraped.content}\n`;
        if (scraped.keyPoints) scrapedContentText += `SPECIFICATIONS / BULLETS:\n${scraped.keyPoints}\n\n`;

        if (scraped.ogImage && !bestImageCandidate) {
          bestImageCandidate = scraped.ogImage;
        }
      }
    }

    // === 3. Reddit Community Discussion (if Reddit source) ===
    if (topic.sourceType === 'reddit' && topic.sourceUrl) {
      const discussion = await this.scrapeRedditDiscussion(topic.sourceUrl);
      if (discussion) {
        if (discussion.postBody) {
          scrapedContentText += `=== REDDIT POST DETAIL ===\n${discussion.postBody}\n\n`;
        }
        if (discussion.topComments.length > 0) {
          scrapedContentText += `=== REDDIT DEVELOPER COMMUNITY REACTIONS ===\n`;
          for (const c of discussion.topComments) {
            scrapedContentText += `[u/${c.author}, +${c.score} upvotes]: "${c.text}"\n\n`;
          }
        }
      }
    }

    // === 4. Live Google News RSS Search ===
    const newsResults = await this.searchGoogleNews(topic.title);
    for (const nr of newsResults) {
      addSource({
        title: nr.title,
        url: nr.url,
        sourceName: nr.sourceName,
        type: 'news_report',
        reliability: 88,
        snippet: nr.snippet
      });
    }

    // === 5. Live Hacker News Algolia Search ===
    const hnResults = await this.searchHackerNews(topic.title);
    for (const hr of hnResults) {
      addSource({
        title: hr.title,
        url: hr.url,
        sourceName: hr.sourceName,
        type: hr.type,
        reliability: hr.type === 'official_announcement' ? 95 : 85,
        snippet: hr.snippet
      });
    }

    // If we have an external announcement link from HN or Google News, try scraping it if we haven't scraped anything yet
    if (!scrapedContentText && sources.length > 0) {
      for (const s of sources) {
        if (s.url && !s.url.includes('google.com') && !s.url.includes('ycombinator.com') && !s.url.includes('reddit.com')) {
          const supScraped = await this.scrapePageContent(s.url);
          if (supScraped && supScraped.content && supScraped.wordCount > 50) {
            scrapedContentText += `=== RESEARCH SOURCE ARTICLE ("${supScraped.title}") ===\n${supScraped.content.slice(0, 3000)}\n\n`;
            if (supScraped.ogImage && !bestImageCandidate) {
              bestImageCandidate = supScraped.ogImage;
            }
            break;
          }
        }
      }
    }

    // Assemble the full dossier text with clearly structured source references
    let sourcesReferenceBlock = '=== VERIFIED SOURCES AVAILABLE FOR CITATIONS ===\n';
    sources.forEach((s) => {
      sourcesReferenceBlock += `[Source ${s.id}]: "${s.title}"\n  Publisher/Domain: ${s.sourceName}\n  URL: ${s.url}\n  Type: ${s.type}\n  Snippet: ${s.snippet || 'General reporting'}\n\n`;
    });

    let fullDossierText = `TOPIC: ${topic.title}\nCATEGORY: ${topic.category || 'AI Tools'}\n\n`;
    fullDossierText += sourcesReferenceBlock;
    fullDossierText += `=== VERIFIED RESEARCH & SOURCE EVIDENCE ===\n`;
    if (topic.rawText) {
      fullDossierText += `INITIAL SCOUT CONTEXT:\n${topic.rawText}\n\n`;
    }
    if (scrapedContentText) {
      fullDossierText += scrapedContentText;
    } else {
      // If direct scraping had limited text, provide the snippets from news and HN
      fullDossierText += `AGGREGATED SUMMARY OF FINDINGS:\n`;
      sources.forEach(s => {
        if (s.snippet) fullDossierText += `- ${s.sourceName} reported: ${s.title}. Excerpt: ${s.snippet}\n`;
      });
    }

    db.log('info', 'DeepResearcher', `Dossier built: ${sources.length} sources, image candidate: ${bestImageCandidate ? 'YES' : 'NONE'}`);

    return {
      topicTitle: topic.title,
      category: topic.category || 'AI Tools',
      dossierText: fullDossierText,
      sources,
      sourceCount: sources.length,
      imageCandidate: bestImageCandidate
    };
  }
}

module.exports = new DeepResearcher();
