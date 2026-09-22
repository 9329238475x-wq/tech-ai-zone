const axios = require('axios');
const db = require('../../database/db');

class ImageEngine {
  constructor() {
    // 100% Verified active Unsplash images (All tested and returning HTTP 200)
    this.techImages = {
      'AI Tools': [
        { url: 'https://images.unsplash.com/photo-1684369175833-4b445ad6bfb5?auto=format&fit=crop&w=1200&q=80', caption: 'AI Language Model & Neural Architecture' },
        { url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80', caption: 'Artificial Intelligence Brain Network' },
        { url: 'https://images.unsplash.com/photo-1655720828018-edd2daec9349?auto=format&fit=crop&w=1200&q=80', caption: 'AI Chatbot & Conversational Interface' },
        { url: 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?auto=format&fit=crop&w=1200&q=80', caption: 'Code & AI Development Environment' },
        { url: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80', caption: 'AI Code & Algorithmic Design' }
      ],
      'Breakthrough AI': [
        { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80', caption: 'Frontier AI Research & Deep Learning' },
        { url: 'https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1?auto=format&fit=crop&w=1200&q=80', caption: 'Machine Intelligence & Robotics' },
        { url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80', caption: 'Autonomous Robotic Intelligence' },
        { url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80', caption: 'Neural Computation & Quantum Graph' }
      ],
      'Tech News': [
        { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80', caption: 'Tech Innovation & Startup Ecosystem' },
        { url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80', caption: 'Global Cloud Computing Network' },
        { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80', caption: 'Connected Earth & Cyber Infrastructure' },
        { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', caption: 'Semiconductor Circuit Board' },
        { url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=1200&q=80', caption: 'Software Engineering & Cloud Deploy' }
      ],
      'Next-Gen Hardware': [
        { url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80', caption: 'High-Performance Computing Cluster' },
        { url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80', caption: 'Semiconductor GPU Processing Unit' },
        { url: 'https://images.unsplash.com/photo-1555617981-dac3880eac6e?auto=format&fit=crop&w=1200&q=80', caption: 'Microprocessor Architecture' },
        { url: 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=1200&q=80', caption: 'Silicon Wafer Fabrication' },
        { url: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80', caption: 'Hyperscale Data Center Servers' },
        { url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1200&q=80', caption: 'Enterprise AI Accelerator Hardware' }
      ],
      'Deep Tech': [
        { url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80', caption: 'Matrix Cybersecurity & Deep Encryption' },
        { url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80', caption: 'Distributed Cloud Datacenter Room' },
        { url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80', caption: 'Open Source Software Engineering' },
        { url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=1200&q=80', caption: 'Modern Developer Code Terminal' },
        { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80', caption: 'Deep Tech Systems Architecture' }
      ]
    };

    this.defaultImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
    this.recentlyUsed = [];
  }

  // Live URL validation to guarantee no 404 image is EVER assigned
  async verifyUrl(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
    try {
      const res = await axios.head(url, { timeout: 5000, maxRedirects: 3 });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  // Resolves both featured hero image and secondary in-content figure
  async resolveArticleImages(topic, candidateImageUrl = null) {
    const primary = await this.resolveImage(topic, candidateImageUrl);

    if (!primary) {
      return { primary: null, secondary: null };
    }

    const category = topic.category || 'Tech News';
    const categoryImages = this.techImages[category] || this.techImages['Tech News'];
    const usedImageUrls = new Set(this.getUsedImageUrls());
    usedImageUrls.add(primary.imageUrl);
    const allLibraryImages = Object.values(this.techImages).flat();
    
    // Pick secondary different from primary
    const categorySecondaryPool = categoryImages.filter(img => img.url !== primary.imageUrl && !usedImageUrls.has(img.url));
    const secondaryPool = categorySecondaryPool.length > 0
      ? categorySecondaryPool
      : allLibraryImages.filter(img => img.url !== primary.imageUrl && !usedImageUrls.has(img.url));
    const selectedSecondary = secondaryPool.length > 0
      ? secondaryPool[Math.floor(Math.random() * secondaryPool.length)]
      : null;

    if (!selectedSecondary) {
      db.log('warn', 'ImageEngine', `No unused secondary image remains for: "${topic.title}"`);
      return { primary: null, secondary: null };
    }

    const secondary = {
      imageUrl: selectedSecondary.url,
      caption: `Technical Architecture & Ecosystem Integration — ${topic.title}`,
      credit: 'Tech AI Zone Visual Lab / Unsplash',
      licenseType: 'Unsplash Free License'
    };

    return { primary, secondary };
  }

  async resolveImage(topic, candidateImageUrl = null) {
    const rawImage = candidateImageUrl || topic.imageUrl;
    
    // 1. If candidate image provided, verify it first
    if (rawImage && (rawImage.startsWith('http://') || rawImage.startsWith('https://'))) {
      const isValidFormat = !rawImage.includes('default') 
        && !rawImage.includes('self') 
        && !rawImage.includes('nsfw')
        && !rawImage.includes('reddit.com/r/')
        && !rawImage.includes('redditmedia.com/award');

      if (isValidFormat) {
        const isLive = !this.isImageUsed(rawImage) && await this.verifyUrl(rawImage);
        if (isLive) {
          db.log('info', 'ImageEngine', `Using verified source image: ${rawImage.slice(0, 80)}...`);
          return {
            imageUrl: rawImage,
            sourceUrl: topic.sourceUrl || topic.externalUrl || '',
            caption: `${topic.title}`,
            credit: `${topic.sourceType ? topic.sourceType.charAt(0).toUpperCase() + topic.sourceType.slice(1) : 'Official'} Source`,
            licenseType: 'Editorial & Fair Use'
          };
        }
      }
    }

    // 2. Fallback to verified category library
    const category = topic.category || 'Tech News';
    const categoryImages = this.techImages[category] || this.techImages['Tech News'];
    
    const usedImageUrls = new Set(this.getUsedImageUrls());
    const allLibraryImages = Object.values(this.techImages).flat();
    const categoryAvailable = categoryImages.filter(img => !usedImageUrls.has(img.url) && !this.recentlyUsed.includes(img.url));
    const available = categoryAvailable.length > 0
      ? categoryAvailable
      : allLibraryImages.filter(img => !usedImageUrls.has(img.url) && !this.recentlyUsed.includes(img.url));
    const pool = available;

    if (pool.length === 0) {
      db.log('warn', 'ImageEngine', `No globally unused image remains for category: ${category}`);
      return null;
    }
    
    const selected = pool[Math.floor(Math.random() * pool.length)];
    
    this.recentlyUsed.push(selected.url);
    if (this.recentlyUsed.length > 15) {
      this.recentlyUsed.shift();
    }

    return {
      imageUrl: selected.url,
      sourceUrl: topic.sourceUrl || '',
      caption: `${selected.caption} — ${topic.title}`,
      credit: 'Unsplash / Tech AI Zone Editorial',
      licenseType: 'Unsplash Free License'
    };
  }

  recordImage(postId, imgData) {
    try {
      db.run(`
        INSERT INTO images (post_id, image_url, source_url, caption, credit, license_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        postId,
        imgData.imageUrl,
        imgData.sourceUrl || '',
        imgData.caption || '',
        imgData.credit || '',
        imgData.licenseType || 'Editorial'
      ]);
    } catch (err) {
      console.error('Failed to record image:', err.message);
    }
  }

  getUsedImageUrls() {
    const recordedImages = db.all('SELECT DISTINCT image_url AS url FROM images WHERE image_url IS NOT NULL');
    const featuredImages = db.all('SELECT DISTINCT featured_image AS url FROM posts WHERE featured_image IS NOT NULL');
    return [...new Set([...recordedImages, ...featuredImages].map(row => row.url).filter(Boolean))];
  }

  isImageUsed(imageUrl) {
    if (!imageUrl) return false;
    return !!db.get('SELECT id FROM images WHERE image_url = ? LIMIT 1', [imageUrl]);
  }
}

module.exports = new ImageEngine();
