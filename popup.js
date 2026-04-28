// popup.js — OpenPane extension popup

function fmtTokens(n) {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function fmtTime(ts) {
  if (!ts) return 'Never updated';
  return 'Updated ' + new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderStats(stats) {
  const content = document.getElementById('content');

  if (!stats) {
    content.innerHTML = `
      <div class="stats">
        <div class="stat wide">
          <div class="stat-val">—</div>
          <div class="stat-label">No context captured yet</div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="status inactive">Open claude.ai and send a message</div>
      <div class="actions">
        <button class="btn btn-primary" id="toggle-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/>
          </svg>
          Toggle Sidebar
        </button>
      </div>
    `;
  } else {
    const modelStr = stats.model
      ? stats.model.replace(/^claude-/, '').replace(/-\d{8}$/, '')
      : null;

    content.innerHTML = `
      <div class="stats">
        <div class="stat">
          <div class="stat-val">${fmtTokens(stats.totalTokens)}</div>
          <div class="stat-label">Tokens used</div>
        </div>
        <div class="stat">
          <div class="stat-val">${stats.blockCount ?? 0}</div>
          <div class="stat-label">Context blocks</div>
        </div>
        ${modelStr ? `
        <div class="stat wide">
          <div class="stat-val">${modelStr}</div>
          <div class="stat-label">Model</div>
        </div>` : ''}
      </div>
      <div class="divider"></div>
      <div class="status active">${fmtTime(stats.lastUpdated)}</div>
      <div class="actions">
        <button class="btn btn-primary" id="toggle-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/>
          </svg>
          Toggle Sidebar
        </button>
        <button class="btn btn-secondary" id="open-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open claude.ai
        </button>
      </div>
    `;
  }

  // Wire toggle button
  document.getElementById('toggle-btn')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle-sidebar' }, () => {
        void chrome.runtime.lastError; // suppress error if content script not ready
      });
    });
    window.close();
  });

  // Wire open button
  document.getElementById('open-btn')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const isClaude = tabs[0]?.url?.includes('claude.ai');
      if (isClaude) {
        chrome.tabs.update(tabs[0].id, { active: true });
      } else {
        chrome.tabs.create({ url: 'https://claude.ai' });
      }
    });
    window.close();
  });
}

// Check if the active tab is claude.ai
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const isClaude = tab?.url?.includes('claude.ai');

  if (!isClaude) {
    renderStats(null);
    return;
  }

  // Query the content script directly — avoids service worker lifetime issues.
  chrome.tabs.sendMessage(tab.id, { type: 'get-stats' }, (response) => {
    void chrome.runtime.lastError;
    renderStats(response?.stats ?? null);
  });
});
