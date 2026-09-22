const db = require('../../database/db');

class AdsEngine {
  getClientId() {
    return db.getSetting('adsense_client_id', '') || process.env.ADSENSE_CLIENT_ID || '';
  }

  isEnabled() {
    return (db.getSetting('ads_enabled', 'false') === 'true') || (process.env.ADS_ENABLED === 'true');
  }

  getHeadScript() {
    if (!this.isEnabled()) return '';
    let headAd = db.getSetting('global_head_ad', '');
    if (headAd && headAd.trim()) {
      // Ensure third-party ad scripts are non-blocking so they never slow down the website
      return headAd
        .replace(/<script\b(?![^>]*\basync\b)/gi, '<script async="async"')
        .replace(/<script\b(?![^>]*\bdefer\b)/gi, '<script defer="defer"');
    }
    return '';
  }

  getCustomAd(slotType) {
    const slotCode = db.getSetting(`custom_ad_${slotType}`, '');
    if (slotCode && slotCode.trim()) return slotCode.trim();

    const globalCode = db.getSetting('global_custom_ad', '');
    if (globalCode && globalCode.trim()) {
      // If code contains a single unique container ID (e.g. Adsterra Native Banner),
      // render it only in primary slot to avoid duplicate ID collision.
      const hasSpecificContainer = /id=["']container-[^"']+["']/i.test(globalCode);
      if (hasSpecificContainer) {
        if (slotType === 'header' || slotType === 'top') {
          return globalCode.trim();
        }
        return null;
      }
      return globalCode.trim();
    }
    return null;
  }

  getFallbackUrl() {
    return db.getSetting('custom_affiliate_url', 'https://www.hostinger.com?REFERRALCODE=XCE9329231KF');
  }

  renderHorizontalBanner(referralUrl) {
    return `
      <div class="ad-live-banner ad-banner-horizontal">
        <div class="ad-banner-info">
          <span class="ad-badge-tag">⚡ VERIFIED CLOUD PARTNER</span>
          <strong class="ad-banner-title">Deploy AI Models, Python Bots & Web Apps with 99.9% Uptime</strong>
          <span class="ad-banner-deal">🎁 Special Reader Offer: Up to 75% OFF + Free SSL & Domain</span>
        </div>
        <a href="${referralUrl}" target="_blank" rel="noopener sponsored" class="ad-banner-cta">
          Claim Deal (75% Off) ↗
        </a>
      </div>
    `;
  }

  renderBoxBanner(referralUrl) {
    return `
      <div class="ad-live-banner ad-banner-box">
        <span class="ad-badge-tag">⚡ CLOUD INFRASTRUCTURE</span>
        <strong class="ad-box-title">High-Speed Cloud & VPS for Developers</strong>
        <p class="ad-box-desc">Run Docker containers, automated scripts, and AI APIs on NVMe SSD storage with dedicated IP.</p>
        <div class="ad-box-action">
          <span class="ad-box-price">Starting at ₹149/mo</span>
          <a href="${referralUrl}" target="_blank" rel="noopener sponsored" class="ad-banner-cta">
            Access Deal ↗
          </a>
        </div>
      </div>
    `;
  }

  renderInContentBanner(referralUrl) {
    return `
      <div class="ad-live-banner ad-banner-incontent">
        <div class="ad-incontent-left">
          <span class="ad-badge-tag">⚡ DEVELOPER INFRASTRUCTURE PARTNER</span>
          <strong class="ad-incontent-title">Host Your Web Applications & AI Backends 24/7</strong>
          <p class="ad-incontent-desc">Hostinger Cloud VPS with ultra-fast NVMe storage, dedicated IPv4/IPv6, and 1-click Node/Python deployment.</p>
        </div>
        <div class="ad-incontent-right">
          <span class="ad-save-tag">SAVE UP TO 75%</span>
          <a href="${referralUrl}" target="_blank" rel="noopener sponsored" class="ad-banner-cta">
            Claim Discount Now ↗
          </a>
        </div>
      </div>
    `;
  }

  renderSlot(slotType) {
    // If monetization / ads are disabled, do not render anything
    if (!this.isEnabled()) {
      return '';
    }

    // 1. If custom ad code (Adsterra, PropellerAds, Banner script) is configured
    const customAd = this.getCustomAd(slotType);
    if (customAd) {
      const fallbackUrl = this.getFallbackUrl();
      const fallbackBanner = (slotType === 'sidebar' || slotType === 'sidebar-mid' || slotType === 'left-sidebar') 
        ? this.renderBoxBanner(fallbackUrl)
        : (slotType === 'in-content' ? this.renderInContentBanner(fallbackUrl) : this.renderHorizontalBanner(fallbackUrl));

      return `
        <div class="ad-container ad-${slotType}">
          <div class="ad-label">ADVERTISEMENT</div>
          <div class="ad-custom-wrapper" id="ad-slot-${slotType}">
            <div class="ad-network-embed" style="width: 100%;">
              ${customAd}
            </div>
            <!-- Guaranteed Fallback: automatically displayed if ad network returns empty / localhost / blocked -->
            <div class="ad-guaranteed-fallback" style="display: none; width: 100%;">
              ${fallbackBanner}
            </div>
          </div>
        </div>
        <script>
          (function() {
            var slot = document.getElementById('ad-slot-${slotType}');
            if (!slot) return;
            var embed = slot.querySelector('.ad-network-embed');
            var fallback = slot.querySelector('.ad-guaranteed-fallback');
            if (!embed || !fallback) return;

            // If on localhost, Adsterra will not serve live ads unless domain is tech-ai-zone.com
            // So after 600ms if container is empty, reveal verified live banner immediately!
            var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            var checkDelay = isLocal ? 600 : 2000;

            setTimeout(function() {
              var container = embed.querySelector('[id^="container-"]');
              var hasLiveAd = container && (container.children.length > 0 || container.offsetHeight > 30);
              if (!hasLiveAd) {
                embed.style.display = 'none';
                fallback.style.display = 'block';
              }
            }, checkDelay);
          })();
        </script>
      `;
    }

    // 2. If Google AdSense is explicitly chosen as the network mode
    const networkMode = db.getSetting('ad_network_mode', 'custom');
    if (networkMode === 'adsense') {
      const clientId = this.getClientId();
      if (clientId) {
        const formattedClientId = clientId.startsWith('ca-') ? clientId : 'ca-' + clientId;
        return `
          <div class="ad-container ad-${slotType}">
            <div class="ad-label">ADVERTISEMENT</div>
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="${formattedClientId}"
                 data-ad-slot="1234567890"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
            <script>
                 (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
          </div>
        `;
      }
    }

    // 3. Fallback: High-Converting Live Verified Partner Banners (Never leave empty space)
    const refUrl = this.getFallbackUrl();
    let bannerHtml = '';

    if (slotType === 'sidebar' || slotType === 'sidebar-mid' || slotType === 'left-sidebar') {
      bannerHtml = this.renderBoxBanner(refUrl);
    } else if (slotType === 'in-content') {
      bannerHtml = this.renderInContentBanner(refUrl);
    } else {
      bannerHtml = this.renderHorizontalBanner(refUrl);
    }

    return `
      <div class="ad-container ad-${slotType}">
        <div class="ad-label">SPONSORED PARTNER</div>
        <div class="ad-custom-wrapper">
          ${bannerHtml}
        </div>
      </div>
    `;
  }
}

module.exports = new AdsEngine();
