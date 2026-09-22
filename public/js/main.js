// Tech AI Zone — Client Interactions
document.addEventListener('DOMContentLoaded', () => {

  // 1. Reading Progress Bar
  const progressBar = document.getElementById('reading-progress-bar');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (height > 0) {
        progressBar.style.width = ((winScroll / height) * 100) + '%';
      }
    }, { passive: true });
  }

  // 2. Sticky Header Scroll Effect
  const header = document.getElementById('site-header');
  const stickyNav = document.getElementById('sticky-newspaper-navbar');
  if (header || stickyNav) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (header) {
        if (scrollY > 20) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
      if (stickyNav) {
        if (scrollY > 15) {
          stickyNav.classList.add('is-stuck');
        } else {
          stickyNav.classList.remove('is-stuck');
        }
      }
    }, { passive: true });
  }

  // 3. Search Toggle & Live Instant Search
  const searchToggle = document.getElementById('search-toggle');
  const searchOverlay = document.getElementById('search-overlay');
  const searchInput = document.getElementById('search-input');
  const searchClose = document.getElementById('search-close');
  const searchResults = document.getElementById('search-results');

  function openSearch() {
    closeMobileNav();
    if (searchOverlay) {
      searchOverlay.classList.add('active');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 120);
      }
    }
  }

  function closeSearch() {
    if (searchOverlay) {
      searchOverlay.classList.remove('active');
      if (searchResults) {
        searchResults.innerHTML = '';
        searchResults.classList.remove('has-results');
      }
    }
  }

  if (searchToggle) {
    searchToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (searchOverlay.classList.contains('active')) {
        closeSearch();
      } else {
        openSearch();
      }
    });
  }

  if (searchClose) {
    searchClose.addEventListener('click', closeSearch);
  }

  // Global Keyboard Shortcuts (Ctrl+K, Cmd+K, or '/')
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    } else if (e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && searchOverlay && searchOverlay.classList.contains('active')) {
      closeSearch();
    }
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (searchOverlay && searchOverlay.classList.contains('active')) {
      const frame = searchOverlay.querySelector('.search-bar-frame');
      if (frame && !frame.contains(e.target) && !searchToggle.contains(e.target)) {
        closeSearch();
      }
    }
  });

  // Debounced Live Search
  let searchTimer = null;
  if (searchInput && searchResults) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      clearTimeout(searchTimer);

      if (q.length < 2) {
        searchResults.innerHTML = '';
        searchResults.classList.remove('has-results');
        return;
      }

      searchTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          const items = data.results || [];

          if (items.length === 0) {
            searchResults.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 0.85rem; font-style: italic;">No dispatches found matching "${q}".</div>`;
            searchResults.classList.add('has-results');
          } else {
            searchResults.innerHTML = items.map(item => `
              <a href="/post/${item.slug}" class="search-result-item">
                <div>
                  <div class="search-result-title">${item.title}</div>
                  <div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 2px;">${item.read_time || 4} min read • Verified Dispatch</div>
                </div>
                <span class="search-result-category">${item.category}</span>
              </a>
            `).join('');
            searchResults.classList.add('has-results');
          }
        } catch (err) {
          console.error('Search error:', err);
        }
      }, 180);
    });

    // Press Enter to navigate to first result
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstLink = searchResults.querySelector('.search-result-item');
        if (firstLink) {
          window.location.href = firstLink.getAttribute('href');
        }
      }
    });
  }

  // 4. Mobile Hamburger Menu
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileNavClose = document.getElementById('mobile-nav-close');
  const navLinks = document.getElementById('nav-links');

  function openMobileNav() {
    closeSearch();
    if (!navLinks) return;
    if (hamburgerBtn) hamburgerBtn.classList.add('active');
    navLinks.classList.add('mobile-open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    if (!navLinks) return;
    if (hamburgerBtn) hamburgerBtn.classList.remove('active');
    navLinks.classList.remove('mobile-open');
    document.body.style.overflow = '';
  }

  if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navLinks.classList.contains('mobile-open')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  if (mobileNavClose) {
    mobileNavClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMobileNav();
    });
  }

  // Close menu when clicking any nav link
  if (navLinks) {
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        closeMobileNav();
      });
    });
  }

  // Close menu on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks && navLinks.classList.contains('mobile-open')) {
      closeMobileNav();
    }
  });

  // 5. Copy / Share Article Link
  const shareButtons = document.querySelectorAll('.btn-share');
  shareButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const title = document.title;
      const url = window.location.href;

      if (navigator.share) {
        try {
          await navigator.share({ title, url });
        } catch (err) {
          // User cancelled share
        }
      } else {
        try {
          await navigator.clipboard.writeText(url);
          const origText = btn.textContent;
          btn.textContent = '✓ Copied!';
          btn.style.color = '#10b981';
          setTimeout(() => {
            btn.textContent = origText;
            btn.style.color = '';
          }, 2000);
        } catch (err) {
          // Clipboard fallback
        }
      }
    });
  });

  // 6. Intersection Observer for card animations
  const animatedCards = document.querySelectorAll('.post-card');
  if (animatedCards.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    animatedCards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = `opacity 0.5s ease ${index * 0.06}s, transform 0.5s ease ${index * 0.06}s`;
      observer.observe(card);
    });
  }

  // 7. Smart Slide-In Affiliate Recommendation Popup Drawer
  const slideInDrawer = document.getElementById('affiliate-slidein-drawer');
  const closeDrawerBtn = document.getElementById('btn-close-affiliate-drawer');

  if (slideInDrawer) {
    const isDismissed = sessionStorage.getItem('affiliate_drawer_dismissed') === 'true';

    if (!isDismissed) {
      let shown = false;

      function showDrawer() {
        if (!shown) {
          shown = true;
          slideInDrawer.classList.add('visible');
          slideInDrawer.setAttribute('aria-hidden', 'false');
        }
      }

      // Trigger on 30% scroll depth
      window.addEventListener('scroll', () => {
        if (shown) return;
        const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (totalHeight > 0) {
          const scrollFraction = window.scrollY / totalHeight;
          if (scrollFraction >= 0.30) {
            showDrawer();
          }
        }
      }, { passive: true });

      // Trigger fallback timer after 10 seconds
      setTimeout(() => {
        showDrawer();
      }, 10000);

      // Dismiss button handler
      if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', () => {
          slideInDrawer.classList.remove('visible');
          slideInDrawer.setAttribute('aria-hidden', 'true');
          sessionStorage.setItem('affiliate_drawer_dismissed', 'true');
        });
      }
    }
  }

  // 8. Article Like / Dislike Interaction Handler
  const feedbackGroup = document.getElementById('feedback-btns-group');
  const likeBtn = document.getElementById('btn-react-like');
  const dislikeBtn = document.getElementById('btn-react-dislike');
  const likeCount = document.getElementById('like-count-display');
  const dislikeCount = document.getElementById('dislike-count-display');
  const feedbackMsg = document.getElementById('feedback-msg-box');

  if (feedbackGroup && likeBtn && dislikeBtn) {
    const postId = feedbackGroup.dataset.postId;
    const storageKey = `post_reacted_${postId}`;
    const alreadyReacted = localStorage.getItem(storageKey);

    if (alreadyReacted) {
      if (alreadyReacted === 'like') {
        likeBtn.style.background = '#1c1917';
        likeBtn.style.color = '#ffffff';
      } else {
        dislikeBtn.style.background = '#1c1917';
        dislikeBtn.style.color = '#ffffff';
      }
    }

    async function sendReaction(type) {
      if (localStorage.getItem(storageKey)) {
        if (feedbackMsg) {
          feedbackMsg.style.display = 'block';
          feedbackMsg.textContent = '✓ You have already recorded feedback for this dispatch.';
        }
        return;
      }

      try {
        const res = await fetch(`/api/posts/${postId}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction: type, feedback: '' })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem(storageKey, type);
          if (likeCount) likeCount.textContent = data.likes;
          if (dislikeCount) dislikeCount.textContent = data.dislikes;
          if (feedbackMsg) {
            feedbackMsg.style.display = 'block';
            feedbackMsg.textContent = '✓ Thank you for your feedback.';
          }
          if (type === 'like') {
            likeBtn.style.background = '#1c1917';
            likeBtn.style.color = '#ffffff';
          } else {
            dislikeBtn.style.background = '#1c1917';
            dislikeBtn.style.color = '#ffffff';
          }
        }
      } catch (e) {
        console.error('Reaction failed:', e);
      }
    }

    likeBtn.addEventListener('click', () => sendReaction('like'));
    dislikeBtn.addEventListener('click', () => sendReaction('dislike'));
  }

  // 12. Real-time Live Broadsheet Top Bar Engine (Global UTC Date & Market Indices)
  const liveDateEl = document.getElementById('live-server-date');
  const activeReadersEl = document.getElementById('live-active-readers-count');
  const tickerNvda = document.getElementById('ticker-nvda-val');
  const tickerBtc = document.getElementById('ticker-btc-val');
  const tickerNasdaq = document.getElementById('ticker-nasdaq-val');

  // Global standard UTC date updater (consistent worldwide)
  function updateLiveDate() {
    if (liveDateEl) {
      const now = new Date();
      liveDateEl.textContent = now.toLocaleDateString('en-US', {
        timeZone: 'UTC',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
  updateLiveDate();
  setInterval(updateLiveDate, 60000);

  // Live tech indices realistic fluctuation
  let currentNvda = 129.45;
  let currentBtc = 64380;
  let currentNasdaq = 19842;

  function flashTicker(el, isUp) {
    if (!el) return;
    const parent = el.closest('.live-ticker-fluctuate') || el;
    parent.classList.remove('tick-up', 'tick-down');
    void parent.offsetWidth; // trigger reflow
    parent.classList.add(isUp ? 'tick-up' : 'tick-down');
    setTimeout(() => parent.classList.remove('tick-up', 'tick-down'), 1000);
  }

  function fluctuateMarkets() {
    // Random fluctuation for NVDA (+/- $0.05 to $0.45)
    if (tickerNvda) {
      const delta = (Math.random() * 0.5 - 0.22);
      currentNvda = Math.max(120, +(currentNvda + delta).toFixed(2));
      const isUp = delta >= 0;
      tickerNvda.innerHTML = `$${currentNvda.toFixed(2)} ${isUp ? '+1.9%' : '+1.7%'} ${isUp ? '▲' : '▼'}`;
      tickerNvda.className = isUp ? 'ticker-up' : 'ticker-down';
      flashTicker(tickerNvda, isUp);
    }

    // Random fluctuation for BTC (+/- $15 to $85)
    if (tickerBtc) {
      const btcDelta = Math.floor(Math.random() * 120 - 50);
      currentBtc = Math.max(60000, currentBtc + btcDelta);
      const isBtcUp = btcDelta >= 0;
      tickerBtc.innerHTML = `$${currentBtc.toLocaleString()} ${isBtcUp ? '+2.4%' : '+2.2%'} ${isBtcUp ? '▲' : '▼'}`;
      tickerBtc.className = isBtcUp ? 'ticker-up' : 'ticker-down';
      flashTicker(tickerBtc, isBtcUp);
    }

    // NASDAQ 100 index fluctuation
    if (tickerNasdaq) {
      const nasdaqDelta = Math.floor(Math.random() * 20 - 9);
      currentNasdaq = Math.max(19000, currentNasdaq + nasdaqDelta);
      const isNasdaqUp = nasdaqDelta >= 0;
      tickerNasdaq.innerHTML = `${currentNasdaq.toLocaleString()} ${isNasdaqUp ? '+0.9%' : '+0.8%'} ${isNasdaqUp ? '▲' : '▼'}`;
      tickerNasdaq.className = isNasdaqUp ? 'ticker-up' : 'ticker-down';
      flashTicker(tickerNasdaq, isNasdaqUp);
    }
  }
  setInterval(fluctuateMarkets, 4500);

  // Live active reader count fluctuation
  if (activeReadersEl) {
    let readers = parseInt(activeReadersEl.textContent, 10) || 128;
    setInterval(() => {
      const readerDelta = Math.floor(Math.random() * 7) - 3;
      readers = Math.max(88, Math.min(260, readers + readerDelta));
      activeReadersEl.textContent = readers;
    }, 8000);
  }
});
