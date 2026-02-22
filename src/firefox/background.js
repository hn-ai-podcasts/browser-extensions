const _API_BASE = 'https://hn-ai-podcast.duckdns.org/api';
let audioElement = null;
const _currentPlayingStoryId = null;
let isAudioLocked = false;
function ensureAudio() {
  if (!audioElement) {
    audioElement = new Audio();
    audioElement.addEventListener('loadstart', () => {});
    audioElement.addEventListener('loadedmetadata', () => {});
    audioElement.addEventListener('canplay', () => {
      isAudioLocked = false;
    });
    audioElement.addEventListener('play', () => {
      isAudioLocked = false;
      broadcastState();
    });
    audioElement.addEventListener('pause', () => {
      broadcastState();
    });
    audioElement.addEventListener('timeupdate', () => {
      updateStateAndBroadcast();
    });
    audioElement.addEventListener('ended', () => {
      isAudioLocked = false;
      broadcastState();
    });
    audioElement.addEventListener('error', (_e) => {
      isAudioLocked = false;
      broadcastState();
    });
    audioElement.addEventListener('stalled', () => {});
    audioElement.addEventListener('waiting', () => {});
    audioElement.addEventListener('suspend', () => {});
  }
  return audioElement;
}
function resetAudioIfNeeded() {
  if (isAudioLocked) {
    if (audioElement) {
      try {
        audioElement.pause();
        audioElement.src = '';
        audioElement.load();
      } catch (_e) {}
    }
    audioElement = null;
    isAudioLocked = false;
    return true;
  }
  return false;
}
async function getPlayerState() {
  const data = await browser.storage.local.get('playerState');
  const state = data.playerState || {
    storyId: null,
    title: null,
    audioUrl: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  };
  return state;
}
async function setPlayerState(updates) {
  const current = await getPlayerState();
  const newState = { ...current, ...updates };
  if (newState.currentTime !== undefined) newState.currentTime = Number(newState.currentTime) || 0;
  if (newState.duration !== undefined) newState.duration = Number(newState.duration) || 0;
  await browser.storage.local.set({ playerState: newState });
  return newState;
}
async function updateStateAndBroadcast() {
  const audio = ensureAudio();
  const _state = await setPlayerState({
    isPlaying: !audio.paused,
    currentTime: audio.currentTime,
    duration: audio.duration,
  });
  broadcastState();
}
async function broadcastState(storyId, stateLabel) {
  if (!storyId) {
    const state = await getPlayerState();
    storyId = state.storyId;
    stateLabel = state.isPlaying ? 'playing' : 'stopped';
  }
  const fullState = await getPlayerState();
  browser.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      browser.tabs
        .sendMessage(tab.id, {
          type: 'UPDATE_PLAYER_UI',
          storyId,
          state: stateLabel,
        })
        .catch(() => {});
    });
  });
  browser.runtime
    .sendMessage({
      type: 'PLAYER_UPDATE',
      state: fullState,
    })
    .catch(() => {});
}
browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'TOGGLE_AUDIO') {
    (async () => {
      try {
        resetAudioIfNeeded();
        const state = await getPlayerState();
        const incomingId = String(msg.storyId);
        const currentIdStr = String(state.storyId || '');
        const audio = ensureAudio();
        if (currentIdStr === incomingId) {
          if (audio.paused) {
            if (!audio.src || audio.src === '') {
              audio.src = state.audioUrl || msg.url;
              audio.currentTime = state.currentTime || 0;
            }
            isAudioLocked = true;
            await audio.play();
            await setPlayerState({ isPlaying: true });
          } else {
            audio.pause();
            await setPlayerState({ isPlaying: false });
          }
        } else {
          if (audio.src) {
            audio.pause();
            audio.currentTime = 0;
          }
          await setPlayerState({
            storyId: incomingId,
            isPlaying: true,
            audioUrl: msg.url,
            title: msg.title,
            storyUrl: msg.storyUrl,
            currentTime: 0,
          });
          audio.src = msg.url;
          audio.load();
          isAudioLocked = true;
          try {
            await audio.play();
          } catch (_playError) {
            isAudioLocked = false;
            await setPlayerState({ isPlaying: false });
          }
        }
      } catch (_e) {
        isAudioLocked = false;
      }
    })();
    return;
  }
  if (msg.type === 'GET_PLAYER_STATE') {
    getPlayerState().then(sendResponse);
    return true;
  }
  if (msg.type === 'AUDIO_COMMAND') {
    (async () => {
      try {
        resetAudioIfNeeded();
        const audio = ensureAudio();
        if (msg.command === 'play') {
          audio.src = msg.url;
          if (msg.currentTime) audio.currentTime = msg.currentTime;
          audio.load();
          isAudioLocked = true;
          await audio.play();
        } else if (msg.command === 'toggle') {
          if (audio.paused) {
            isAudioLocked = true;
            await audio.play();
          } else {
            audio.pause();
          }
        } else if (msg.command === 'stop') {
          audio.pause();
          audio.currentTime = 0;
          await setPlayerState({
            isPlaying: false,
            currentTime: 0,
          });
          broadcastState();
        }
      } catch (_e) {
        isAudioLocked = false;
      }
    })();
    return true;
  }
  if (msg.type === 'BROADCAST_REFRESH') {
    browser.tabs.query({ url: '*://news.ycombinator.com/*' }, (tabs) => {
      tabs.forEach((tab) => {
        browser.tabs.sendMessage(tab.id, { type: 'REFRESH_PODCASTS_UI' }).catch(() => {});
      });
    });
    return;
  }
  if (msg.type === 'API_PROXY_FETCH') {
    (async () => {
      try {
        const options = {
          method: msg.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        };
        const response = await fetch(msg.url, options);
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_e) {
          data = null;
        }
        sendResponse({
          ok: response.ok,
          status: response.status,
          data,
          error: !response.ok ? data?.details || response.statusText : null,
        });
      } catch (err) {
        sendResponse({ ok: false, status: 0, error: err.message });
      }
    })();
    return true;
  }
  if (msg.type === 'AUDIO_ERROR' && msg.error === 'NO_AUDIO_INSTANCE') {
    (async () => {
      const state = await getPlayerState();
      if (state.audioUrl) {
        resetAudioIfNeeded();
        const audio = ensureAudio();
        audio.src = state.audioUrl;
        if (state.currentTime) audio.currentTime = state.currentTime;
        audio.load();
        isAudioLocked = true;
        audio.play().catch((_e) => {});
      }
    })();
    return true;
  }
  if (msg.type === 'DEBUG_AUDIO_STATE') {
    const audio = audioElement;
    const debugInfo = {
      audioExists: !!audio,
      isLocked: isAudioLocked,
      src: audio?.src,
      paused: audio?.paused,
      currentTime: audio?.currentTime,
      duration: audio?.duration,
      readyState: audio?.readyState,
      networkState: audio?.networkState,
      error: audio?.error,
    };
    sendResponse(debugInfo);
    return true;
  }
});
browser.alarms.get('refreshPodcasts', (alarm) => {
  if (!alarm) {
    browser.alarms.create('refreshPodcasts', { periodInMinutes: 1 });
  }
});
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refreshPodcasts') {
    browser.tabs.query({ url: '*://news.ycombinator.com/*' }, (tabs) => {
      tabs.forEach((tab) => {
        browser.tabs.sendMessage(tab.id, { type: 'REFRESH_PODCASTS_UI' }).catch(() => {});
      });
    });
  }
});
browser.alarms.create('audioWatchdog', { periodInMinutes: 0.5 });
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'audioWatchdog') {
    if (isAudioLocked) {
      const state = await getPlayerState();
      if (state.isPlaying && audioElement?.paused) {
        await setPlayerState({ isPlaying: false });
        broadcastState();
      }
    }
  }
});
