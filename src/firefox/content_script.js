const API_BASE = 'https://hn-ai-podcast.duckdns.org/api';
let hnSettings = null;
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
        .hn-podcast-link { font-weight: normal; }
        body.hn-podcast-highlight .hn-podcast-link {
            font-weight: bold !important;
        }
        body.hn-podcast-highlight .hn-podcast-container span {
             font-weight: bold;
        }
    `;
  document.head.appendChild(style);
}
function getErrorMessage(errorObj) {
  if (!errorObj) return 'Unknown error';
  if (typeof errorObj === 'string') return errorObj;
  return errorObj.details || errorObj.error || errorObj.message || JSON.stringify(errorObj);
}
async function proxyFetch(url, optionsOrMethod = 'GET') {
  const method =
    typeof optionsOrMethod === 'string'
      ? optionsOrMethod
      : optionsOrMethod?.method
        ? optionsOrMethod.method
        : 'GET';
  const response = await browser.runtime.sendMessage({
    type: 'API_PROXY_FETCH',
    url,
    method,
  });
  return {
    ok: !!response.ok,
    status: Number.isFinite(response.status) ? response.status : 0,
    json: async () => response.data,
    text: async () =>
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
  };
}
async function fetchSettings() {
  try {
    const res = await proxyFetch(`${API_BASE}/hn/settings?_t=${Date.now()}`);
    if (res.ok) {
      hnSettings = await res.json();
    }
  } catch (_e) {
    hnSettings = {
      min_story_age: 0,
      max_story_age: 31536000,
      min_score: 0,
      min_comments: 0,
    };
  }
}
async function getSelectedLanguage() {
  const { language } = await browser.storage.local.get('language');
  return language || 'en';
}
async function fetchPodcast(id, lang) {
  const res = await proxyFetch(`${API_BASE}/hn/${id}/podcasts/${lang}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET podcast failed: ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data)) return data.length > 0 ? data[0] : null;
  return data;
}
async function scanStories() {
  await fetchSettings();
  const lang = await getSelectedLanguage();
  const allRows = document.querySelectorAll('tr');
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    if (row.classList.contains('athing')) {
      const nextRow = allRows[i + 1];
      if (nextRow) {
        const targetCell = nextRow.querySelector('.subtext, .subline');
        if (targetCell) {
          fixHNAge(nextRow);
          const id = extractId(row, nextRow);
          if (id) {
            renderStoryPodcast(targetCell, id, lang, nextRow, row);
          }
        }
      }
    }
  }
}
async function renderStoryPodcast(targetCell, id, lang, subtextRow, athingRow) {
  let container = document.getElementById(`hn-podcast-container-${id}`);
  if (!container) {
    container = document.createElement('span');
    container.id = `hn-podcast-container-${id}`;
    container.className = 'hn-podcast-container';
    targetCell.appendChild(container);
  }
  let podcast = null;
  try {
    podcast = await fetchPodcast(id, lang);
  } catch (_e) {
    return;
  }
  container.innerHTML = '';
  container.appendChild(document.createTextNode(' | '));
  if (!podcast) {
    if (checkSettings(subtextRow)) {
      const link = createTextLink('Create podcast', id);
      link.addEventListener('click', (e) => handleCreateClick(e, link, id, lang, athingRow));
      container.appendChild(link);
    } else {
      container.innerHTML = '';
    }
  } else {
    if (podcast.is_ready && podcast.audio_url) {
      container.appendChild(createPlayLink(id, podcast.audio_url, athingRow));
      if (podcast.nb_comments_at_creation !== undefined) {
        const info = document.createElement('span');
        info.style.color = '#828282';
        info.style.fontSize = '0.9em';
        info.textContent = ` (${podcast.nb_comments_at_creation} comms)`;
        container.appendChild(info);
      }
    } else if (podcast.error && checkSettings(subtextRow)) {
      const link = createTextLink('⚠️ Error (retry)', id);
      link.style.color = '#d9534f';
      const errMsg = getErrorMessage(podcast.error);
      link.title = errMsg ? `Error: ${errMsg}` : 'Error: click to try again';
      link.addEventListener('click', (e) => handleCreateClick(e, link, id, lang, athingRow));
      container.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.textContent = 'Podcast in progress...';
      span.style.color = '#888';
      container.appendChild(span);
    }
  }
}
function extractId(athingRow, subtextRow) {
  let link = subtextRow.querySelector("a[href*='item?id=']");
  if (link) return parseId(link.href);
  link = athingRow.querySelector("a.titlelink, a.storylink, a[href*='item?id=']");
  if (link) return parseId(link.href);
  return null;
}
function parseId(url) {
  const m = url.match(/item[?=&]id=(\d+)/i);
  return m ? m[1] : null;
}
function checkSettings(subtextRow) {
  if (!hnSettings) {
    return true;
  }
  const meta = extractStoryMeta(subtextRow);
  const _title = getStoryTitle(subtextRow.previousElementSibling);
  const checks = {
    minAge: {
      value: meta.ageInSeconds,
      threshold: hnSettings.min_story_age,
      pass: meta.ageInSeconds >= hnSettings.min_story_age,
      label: 'Min Age (>)',
    },
    maxAge: {
      value: meta.ageInSeconds,
      threshold: hnSettings.max_story_age,
      pass: meta.ageInSeconds <= hnSettings.max_story_age,
      label: 'Max Age (<)',
    },
    minScore: {
      value: meta.score,
      threshold: hnSettings.min_score,
      pass: meta.score >= hnSettings.min_score,
      label: 'Min Score (>)',
    },
    minComments: {
      value: meta.comments,
      threshold: hnSettings.min_comments,
      pass: meta.comments >= hnSettings.min_comments,
      label: 'Min Comments (>)',
    },
  };
  return Object.values(checks).every((c) => c.pass);
}
function extractStoryMeta(subtextRow) {
  const scoreNode = subtextRow.querySelector('.score');
  let score = 0;
  if (scoreNode) score = Number.parseInt(scoreNode.textContent, 10) || 0;
  const ageNode = subtextRow.querySelector('.age');
  let ageInSeconds = 0;
  if (ageNode?.title) {
    const dateStr = ageNode.title.split(' ')[0];
    const storyDate = new Date(dateStr);
    const now = new Date();
    ageInSeconds = (now - storyDate) / 1000;
  }
  const links = subtextRow.querySelectorAll('a');
  let comments = 0;
  for (const link of links) {
    const text = link.textContent;
    if (text.includes('comment')) {
      comments = Number.parseInt(text, 10) || 0;
    } else if (text === 'discuss') {
      comments = 0;
    }
  }
  return { score, ageInSeconds, comments };
}
function getStoryTitle(athingRow) {
  const link =
    athingRow.querySelector('.titleline a') ||
    athingRow.querySelector('a.storylink') ||
    athingRow.querySelector('a.titlelink');
  return link ? link.textContent.trim() : 'Unknown Story';
}
function createTextLink(text, id) {
  const link = document.createElement('a');
  link.href = 'javascript:void(0)';
  link.textContent = text;
  link.className = 'hn-podcast-link';
  link.id = `hn-podcast-link-${id}`;
  return link;
}
function createPlayLink(id, audioUrl, athingRow) {
  const link = createTextLink('▶ Podcast', id);
  link.dataset.state = 'stopped';
  const storyTitle = getStoryTitle(athingRow);
  const storyUrl = `https://news.ycombinator.com/item?id=${id}`;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.sendMessage({
      type: 'TOGGLE_AUDIO',
      storyId: id,
      url: audioUrl,
      title: storyTitle,
      storyUrl,
    });
    const wasPlaying = link.dataset.state === 'playing';
    link.textContent = wasPlaying ? '▶ Podcast' : '⏸︎ Podcast';
    link.dataset.state = wasPlaying ? 'stopped' : 'playing';
  });
  return link;
}
async function handleCreateClick(e, link, id, lang, athingRow) {
  e.preventDefault();
  if (link.textContent.includes('progress')) return;
  const _originalText = link.textContent;
  link.textContent = 'Podcast in progress...';
  link.style.color = '#888';
  link.style.cursor = 'default';
  try {
    const res = await proxyFetch(`${API_BASE}/hn/${id}/podcasts/${lang}`, {
      method: 'PUT',
    });
    if (res.status === 503) {
      const errData = await res.json();
      link.textContent = `⛔ ${errData.details || 'Quota exhausted'}`;
      link.style.color = '#d9534f';
      link.style.cursor = 'not-allowed';
      setTimeout(() => {
        link.style.cursor = 'pointer';
      }, 2000);
      return;
    }
    if (!res.ok) {
      let errData;
      try {
        errData = await res.json();
      } catch (_e) {
        errData = null;
      }
      const customError = new Error('API Error');
      customError.apiData = errData;
      throw customError;
    }
    const targetCell = link.closest('.subtext, .subline');
    if (targetCell) {
      setTimeout(() => renderStoryPodcast(targetCell, id, lang, null, athingRow), 500);
    }
  } catch (err) {
    link.textContent = 'Error (retry)';
    link.style.color = 'red';
    link.style.cursor = 'pointer';
    const errMsg = getErrorMessage(err.apiData || err);
    link.title = `Error: ${errMsg}`;
  }
}
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'REFRESH_PODCASTS_UI') {
    scanStories();
  }
  if (msg.type === 'UPDATE_PLAYER_UI') {
    updatePlayerUI(msg.storyId, msg.state);
  }
  if (msg.type === 'TOGGLE_HIGHLIGHT') {
    if (msg.enabled) {
      document.body.classList.add('hn-podcast-highlight');
    } else {
      document.body.classList.remove('hn-podcast-highlight');
    }
  }
});
function updatePlayerUI(playingStoryId, state) {
  document.querySelectorAll('.hn-podcast-link[data-state]').forEach((link) => {
    link.textContent = '▶ Podcast';
    link.dataset.state = 'stopped';
  });
  if (playingStoryId && state === 'playing') {
    const idStr = String(playingStoryId);
    const activeLink = document.getElementById(`hn-podcast-link-${idStr}`);
    if (activeLink) {
      activeLink.textContent = '⏸︎ Podcast';
      activeLink.dataset.state = 'playing';
    }
  }
}
function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)} years ago`;
  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} months ago`;
  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} days ago`;
  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} hours ago`;
  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} minutes ago`;
  return `${Math.floor(seconds)} seconds ago`;
}
function fixHNAge(subtextRow) {
  const ageNode = subtextRow.querySelector('.age');
  if (!ageNode || !ageNode.title) return;
  let timestamp = 0;
  const parts = ageNode.title.split(' ');
  if (parts.length > 1 && !Number.isNaN(parts[1])) {
    timestamp = Number.parseInt(parts[1], 10) * 1000;
  } else {
    timestamp = new Date(parts[0]).getTime();
  }
  if (timestamp > 0) {
    const newText = timeAgo(timestamp);
    if (ageNode.textContent !== newText) {
      const link = ageNode.querySelector('a');
      if (link) {
        link.textContent = newText;
      } else {
        ageNode.textContent = newText;
      }
    }
  }
}
injectStyles();
browser.storage.local.get('highlight_enabled').then((data) => {
  if (data.highlight_enabled) {
    document.body.classList.add('hn-podcast-highlight');
  }
});
(async () => {
  scanStories();
})();
