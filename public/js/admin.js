// Tech AI Zone Admin Command Center Scripts

document.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.getElementById('btn-generate-now');
  const customTopicInput = document.getElementById('custom-topic-input');
  const logBox = document.getElementById('live-log-box');

  function appendLog(message, isSuccess = false) {
    if (!logBox) return;
    const line = document.createElement('div');
    line.style.color = isSuccess ? '#10b981' : '#cbd5e1';
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }

  // 1. Force Generate Post Now
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const customTopic = customTopicInput ? customTopicInput.value.trim() : '';

      generateBtn.disabled = true;
      generateBtn.innerHTML = '<span>⚡ Running AI Pipeline...</span>';
      appendLog(`Triggering research & generation pipeline for: "${customTopic || 'Top Trending Scout'}"...`);

      try {
        const response = await fetch('/admin/api/generate-now', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customTopic: customTopic || null })
        });

        const data = await response.json();

        if (data.success) {
          appendLog(`Success! Published: "${data.post?.title || 'Article'}"`, true);
          if (data.post?.slug) {
            appendLog(`View post at: /post/${data.post.slug}`, true);
          }
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          appendLog(`Notice: ${data.message || data.error || 'Check system logs for details.'}`);
          generateBtn.disabled = false;
          generateBtn.innerHTML = '<span>⚡ Run AI Pipeline & Post Now</span>';
        }
      } catch (err) {
        appendLog(`Network Error: ${err.message}`);
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>⚡ Run AI Pipeline & Post Now</span>';
      }
    });
  }

  // 2. Delete Post
  const deleteButtons = document.querySelectorAll('.btn-delete-post');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const postId = e.target.dataset.id;
      if (!confirm(`Are you sure you want to delete post #${postId}?`)) return;

      try {
        const res = await fetch(`/admin/api/posts/${postId}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
          const row = document.getElementById(`post-row-${postId}`);
          if (row) row.remove();
          appendLog(`Post #${postId} deleted successfully.`, true);
        }
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    });
  });

  // 3. Multi-Link Directory Manager Scripts
  const quickAddForm = document.getElementById('form-quick-add-link');
  const quickUrlInput = document.getElementById('quick_affiliate_url');
  const directoryTbody = document.getElementById('directory-links-tbody');
  const totalCountTag = document.getElementById('affiliate-total-count');
  const tableCountSpan = document.getElementById('table-links-count');

  function updateDirectoryCount(diff) {
    if (tableCountSpan) {
      const current = parseInt(tableCountSpan.textContent, 10) || 0;
      const updated = Math.max(0, current + diff);
      tableCountSpan.textContent = updated;
      if (totalCountTag) totalCountTag.textContent = `${updated} Links in Directory`;
    }
  }

  // 3a. 1-Click AI Auto-Analyze and Save Link
  if (quickAddForm) {
    quickAddForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-quick-add');
      const url = quickUrlInput ? quickUrlInput.value.trim() : '';
      if (!url) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⚡ AI Analyzing & Saving...</span>';
      }
      appendLog(`Analyzing destination link with AI: ${url}...`);

      try {
        const response = await fetch('/admin/api/affiliates/auto-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (data.success && data.link) {
          const link = data.link;
          appendLog(`Success! AI identified: "${link.tool_name}" (${link.category})`, true);
          
          // Remove "No links" placeholder row if it exists
          const noLinksRow = document.getElementById('no-links-row');
          if (noLinksRow) noLinksRow.remove();

          // Prepend new row to table
          const tr = document.createElement('tr');
          tr.id = `affiliate-row-${link.id}`;
          tr.innerHTML = `
            <td>#${link.id}</td>
            <td>
              <div style="font-weight: 700; color: #f1f5f9;">${link.tool_name}</div>
              <span class="clean-category-badge">${link.category}</span>
            </td>
            <td>
              <div style="font-weight: 600; color: #cbd5e1; font-size: 0.85rem;">${link.headline}</div>
              <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 2px; line-height: 1.35;">${link.description}</div>
            </td>
            <td>
              <a href="${link.affiliate_url}" target="_blank" rel="noopener nofollow" class="table-link-preview" title="${link.affiliate_url}">
                ${link.affiliate_url.length > 25 ? link.affiliate_url.substring(0, 25) + '...' : link.affiliate_url} ↗
              </a>
            </td>
            <td>
              <button class="btn-toggle-affiliate" data-id="${link.id}" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 3px 8px; border-radius: 4px; font-size: 0.74rem; cursor: pointer;">
                Active
              </button>
            </td>
            <td style="text-align: right;">
              <button class="btn-delete btn-delete-affiliate" data-id="${link.id}" title="Delete Link">🗑️</button>
            </td>
          `;

          if (directoryTbody) {
            directoryTbody.insertBefore(tr, directoryTbody.firstChild);
          }

          updateDirectoryCount(1);
          quickAddForm.reset();
        } else {
          alert('Error: ' + (data.error || 'Failed to analyze and save link'));
        }
      } catch (err) {
        alert('Network Error: ' + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>⚡ AI Analyze & Save Link</span>';
        }
      }
    });
  }

  // 3b. Delete & Toggle Affiliate Links (Event Delegation)
  if (directoryTbody) {
    directoryTbody.addEventListener('click', async (e) => {
      // Handle Delete
      const deleteBtn = e.target.closest('.btn-delete-affiliate');
      if (deleteBtn) {
        const linkId = deleteBtn.dataset.id;
        if (!confirm(`Are you sure you want to remove link #${linkId} from the directory?`)) return;

        try {
          const res = await fetch(`/admin/api/affiliates/${linkId}`, { method: 'DELETE' });
          const result = await res.json();
          if (result.success) {
            const row = document.getElementById(`affiliate-row-${linkId}`);
            if (row) row.remove();
            updateDirectoryCount(-1);
            appendLog(`Affiliate link #${linkId} deleted from directory.`, true);
          }
        } catch (err) {
          alert('Delete failed: ' + err.message);
        }
        return;
      }

      // Handle Toggle
      const toggleBtn = e.target.closest('.btn-toggle-affiliate');
      if (toggleBtn) {
        const linkId = toggleBtn.dataset.id;
        try {
          const res = await fetch(`/admin/api/affiliates/${linkId}/toggle`, { method: 'POST' });
          const result = await res.json();
          if (result.success) {
            const isCurrentlyActive = toggleBtn.textContent.trim() === 'Active';
            toggleBtn.textContent = isCurrentlyActive ? 'Paused' : 'Active';
            toggleBtn.style.color = isCurrentlyActive ? '#94a3b8' : '#10b981';
            toggleBtn.style.background = isCurrentlyActive ? 'rgba(148, 163, 184, 0.15)' : 'rgba(16, 185, 129, 0.15)';
            toggleBtn.style.borderColor = isCurrentlyActive ? 'rgba(148, 163, 184, 0.2)' : 'rgba(16, 185, 129, 0.3)';
            appendLog(`Toggled status for link #${linkId}.`, true);
          }
        } catch (err) {
          alert('Toggle failed: ' + err.message);
        }
      }
    });
  }

  // 6. Publishing Schedule Synchronization
  const cronPresetSelect = document.getElementById('cron_preset_select');
  const cronScheduleInput = document.getElementById('cron_schedule');

  if (cronPresetSelect && cronScheduleInput) {
    const currentVal = (cronScheduleInput.value || '').trim();
    let matched = false;

    for (let i = 0; i < cronPresetSelect.options.length; i++) {
      if (cronPresetSelect.options[i].value === currentVal) {
        cronPresetSelect.selectedIndex = i;
        matched = true;
        break;
      }
    }

    if (!matched && currentVal) {
      cronPresetSelect.value = 'custom';
    }

    cronPresetSelect.addEventListener('change', () => {
      const selected = cronPresetSelect.value;
      if (selected !== 'custom') {
        cronScheduleInput.value = selected;
      }
      cronScheduleInput.focus();
    });

    cronScheduleInput.addEventListener('input', () => {
      const typed = cronScheduleInput.value.trim();
      let isPreset = false;
      for (let i = 0; i < cronPresetSelect.options.length; i++) {
        if (cronPresetSelect.options[i].value === typed) {
          cronPresetSelect.selectedIndex = i;
          isPreset = true;
          break;
        }
      }
      if (!isPreset) {
        cronPresetSelect.value = 'custom';
      }
    });
  }
});
