const API_BASE = 'https://hn-ai-podcast.duckdns.org/api';
let ignoreUpdatesUntil = 0;
const SETTINGS_CACHE_KEY = 'cached_settings';
async function fetchLanguages() {
  const res = await fetch(`${API_BASE}/hn/languages`);
  if (!res.ok) throw new Error('Failed to load languages');
  return await res.json();
}
async function fetchSettings() {
  try {
    const res = await fetch(`${API_BASE}/hn/settings`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed settings');
    const data = await res.json();
    await browser.storage.local.set({ [SETTINGS_CACHE_KEY]: data });
    return data;
  } catch (_e) {
    return null;
  }
}
function renderSettings(settings) {
  if (!settings) return;
  document.getElementById('min-score').textContent = settings.min_score;
  document.getElementById('min-comments').textContent = settings.min_comments;
  document.getElementById('min-age').textContent = formatDuration(settings.min_story_age);
  document.getElementById('max-age').textContent = formatDuration(settings.max_story_age);
  document.getElementById('settings-loading').style.display = 'none';
  document.getElementById('settings-list').style.display = 'block';
}
const QUOTA_CACHE_KEY = 'cached_quota';
async function fetchQuota() {
  try {
    const res = await fetch(`${API_BASE}/hn/quota`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed quota');
    const data = await res.json();
    await browser.storage.local.set({ [QUOTA_CACHE_KEY]: data });
    return data;
  } catch (_e) {
    return null;
  }
}
function formatNextSlot(isoDateString) {
  const date = new Date(isoDateString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();
  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const timeStr = date.toLocaleTimeString('en-US', timeOptions).toLowerCase();
  if (isToday) {
    return `today at ${timeStr}`;
  }
  if (isTomorrow) {
    return `tomorrow at ${timeStr}`;
  }
  if (date.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${dayName} at ${timeStr}`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
function renderQuota(quota) {
  if (!quota) return;
  const quotaSection = document.getElementById('quota-section');
  const quotaText = document.getElementById('quota-text');
  const quotaBar = document.getElementById('quota-bar');
  const quotaLabel = document.getElementById('quota-label');
  if (!quotaSection || !quotaText || !quotaBar) return;
  quotaSection.style.display = 'block';
  if (quota.remaining_daily === 0 && quota.next_available_slot) {
    const nextSlotText = formatNextSlot(quota.next_available_slot);
    quotaText.textContent = '0';
    if (quotaLabel) {
      quotaLabel.textContent = `Next slot available: ${nextSlotText}`;
      quotaLabel.style.color = '#d9534f';
    }
    quotaBar.style.width = '0%';
    quotaBar.style.backgroundColor = '#d9534f';
  } else {
    quotaText.textContent = `${quota.remaining_daily}`;
    if (quotaLabel) {
      quotaLabel.textContent = 'Remaining for the community';
      quotaLabel.style.color = '#999';
    }
    const percentage = Math.round((quota.remaining_daily / quota.allowed_daily_podcasts) * 100);
    quotaBar.style.width = `${percentage}%`;
    if (percentage < 20) {
      quotaBar.style.backgroundColor = '#d9534f';
    } else if (percentage < 50) {
      quotaBar.style.backgroundColor = '#f0ad4e';
    } else {
      quotaBar.style.backgroundColor = '#ff6600';
    }
  }
}
async function fetchShow(langCode) {
  try {
    const res = await fetch(`${API_BASE}/hn/shows/${langCode}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Show fetch failed');
    return await res.json();
  } catch (_e) {
    return null;
  }
}
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)} days`;
}
function formatTime(s) {
  if (!Number.isFinite(s) || Number.isNaN(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}
async function updateShowLink(langCode) {
  const container = document.getElementById('show-link-container');
  const link = document.getElementById('show-link');
  container.style.display = 'none';
  const show = await fetchShow(langCode);
  if (show?.feed_url) {
    link.href = show.feed_url;
    link.title = show.title || 'Subscribe';
    container.style.display = 'block';
  }
}
function updatePopupUI(state) {
  if (!state.storyId) {
    playerContainer.style.display = 'none';
    return;
  }
  playerContainer.style.display = 'block';
  playerTitle.textContent = state.title || `Story ${state.storyId}`;
  playerTitle.href = state.storyUrl || '#';
  playerBtn.textContent = state.isPlaying ? '⏸︎' : '▶';
  playerTime.textContent = `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`;
}
async function initPlayerUI() {
  const data = await browser.storage.local.get('playerState');
  if (data.playerState) {
    updatePopupUI(data.playerState);
  }
}
async function loadHNData() {
  const select = document.getElementById('language-select');
  const stored = await browser.storage.local.get('language');
  const currentLang = stored.language || 'en';
  try {
    const langs = await fetchLanguages();
    select.innerHTML = '';
    langs.forEach(({ language, code }) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = language;
      if (code === currentLang) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (_e) {
    if (select.options.length === 0) select.innerHTML = '<option>Error</option>';
  }
  updateShowLink(currentLang);
  select.onchange = async () => {
    await browser.storage.local.set({ language: select.value });
    updateShowLink(select.value);
    chrome.runtime.sendMessage({ type: 'BROADCAST_REFRESH' });
  };
  const cachedSettings = await browser.storage.local.get(SETTINGS_CACHE_KEY);
  if (cachedSettings[SETTINGS_CACHE_KEY]) {
    renderSettings(cachedSettings[SETTINGS_CACHE_KEY]);
  } else {
    document.getElementById('settings-loading').style.display = 'block';
  }
  fetchSettings().then((newSettings) => {
    if (newSettings) {
      renderSettings(newSettings);
    } else if (!cachedSettings[SETTINGS_CACHE_KEY]) {
      document.getElementById('settings-loading').textContent = 'Unavailable';
      document.getElementById('settings-loading').style.color = 'red';
    }
  });
  const cachedQuota = await browser.storage.local.get(QUOTA_CACHE_KEY);
  if (cachedQuota[QUOTA_CACHE_KEY]) {
    renderQuota(cachedQuota[QUOTA_CACHE_KEY]);
  }
  fetchQuota().then((newQuota) => {
    if (newQuota) renderQuota(newQuota);
  });
}
async function init() {
  const highlightCheckbox = document.getElementById('highlight-checkbox');
  const storedHighlight = await browser.storage.local.get('highlight_enabled');
  if (highlightCheckbox) {
    highlightCheckbox.checked = !!storedHighlight.highlight_enabled;
    highlightCheckbox.onchange = async () => {
      const isEnabled = highlightCheckbox.checked;
      await browser.storage.local.set({ highlight_enabled: isEnabled });
      chrome.tabs.query({ url: '*://news.ycombinator.com/*' }, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              type: 'TOGGLE_HIGHLIGHT',
              enabled: isEnabled,
            })
            .catch(() => {});
        });
      });
    };
  }
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const isOnHN = currentTab?.url?.includes('news.ycombinator.com');
    const dashboardElements = document.querySelectorAll('.hn-dashboard');
    const headerLink = document.getElementById('hn-link-header');
    if (isOnHN) {
      dashboardElements.forEach((el) => {
        el.style.display = 'block';
      });
      if (headerLink) headerLink.style.display = 'none';
      loadHNData();
    } else {
      dashboardElements.forEach((el) => {
        el.style.display = 'none';
      });
      if (headerLink) headerLink.style.display = 'block';
    }
  });
  await initPlayerUI();
}
const playerContainer = document.getElementById('player-container');
const playerTitle = document.getElementById('player-link');
const playerBtn = document.getElementById('player-play-btn');
const playerStopBtn = document.getElementById('player-stop-btn');
const playerTime = document.getElementById('player-time');
chrome.runtime.sendMessage({ type: 'GET_PLAYER_STATE' }, (state) => {
  if (state) updatePopupUI(state);
});
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PLAYER_UPDATE') {
    if (Date.now() < ignoreUpdatesUntil) {
      return;
    }
    updatePopupUI(msg.state);
  }
});
playerBtn.addEventListener('click', () => {
  playerBtn.textContent = playerBtn.textContent === '▶' ? '⏸︎' : '▶';
  ignoreUpdatesUntil = Date.now() + 500;
  chrome.runtime.sendMessage({ type: 'GET_PLAYER_STATE' }, (state) => {
    if (state?.storyId) {
      chrome.runtime.sendMessage({
        type: 'TOGGLE_AUDIO',
        storyId: state.storyId,
      });
    }
  });
});
playerStopBtn.addEventListener('click', () => {
  playerBtn.textContent = '▶';
  chrome.runtime.sendMessage({
    type: 'AUDIO_COMMAND',
    command: 'stop',
  });
});
init();
