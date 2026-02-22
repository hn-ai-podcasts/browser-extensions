async function getPlayerState() {
  const data = await chrome.storage.local.get('playerState');
  return (
    data.playerState || {
      storyId: null,
      title: null,
      audioUrl: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }
  );
}
async function setPlayerState(updates) {
  const current = await getPlayerState();
  const newState = { ...current, ...updates };
  if (newState.currentTime !== undefined) newState.currentTime = Number(newState.currentTime) || 0;
  if (newState.duration !== undefined) newState.duration = Number(newState.duration) || 0;
  await chrome.storage.local.set({ playerState: newState });
  return newState;
}
async function ensureOffscreen() {
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });
    if (contexts.length > 0) return;
  } catch (_e) {}
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Playback of podcast audio',
    });
  } catch (e) {
    if (!e.message.startsWith('Only a single offscreen')) {
    }
  }
}
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'TOGGLE_AUDIO') {
    (async () => {
      await ensureOffscreen();
      const state = await getPlayerState();
      const incomingId = String(msg.storyId);
      const currentIdStr = String(state.storyId || '');
      if (currentIdStr === incomingId) {
        chrome.runtime.sendMessage({
          type: 'AUDIO_COMMAND',
          command: 'toggle',
        });
      } else {
        await setPlayerState({
          storyId: incomingId,
          isPlaying: true,
          audioUrl: msg.url,
          title: msg.title,
          storyUrl: msg.storyUrl,
          currentTime: 0,
        });
        chrome.runtime.sendMessage({
          type: 'AUDIO_COMMAND',
          command: 'play',
          url: msg.url,
          storyId: incomingId,
        });
      }
    })();
    return true;
  }
  if (msg.type === 'BROADCAST_REFRESH') {
    chrome.tabs.query({ url: '*://news.ycombinator.com/*' }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_PODCASTS_UI' }).catch(() => {});
      });
    });
    return;
  }
  if (msg.type === 'GET_PLAYER_STATE') {
    getPlayerState().then(sendResponse);
    return true;
  }
  if (msg.type === 'AUDIO_STATE_CHANGED') {
    setPlayerState({
      isPlaying: !!msg.isPlaying,
      currentTime: Number(msg.currentTime),
      duration: Number(msg.duration),
    });
    broadcastState(msg.storyId, msg.isPlaying ? 'playing' : 'stopped');
  }
  if (msg.type === 'AUDIO_COMMAND') {
    if (msg.command === 'stop') {
      (async () => {
        await ensureOffscreen();
        chrome.runtime.sendMessage({ type: 'AUDIO_COMMAND', command: 'stop' });
        setPlayerState({
          isPlaying: false,
          currentTime: 0,
        });
        const state = await getPlayerState();
        broadcastState(state.storyId, 'stopped');
      })();
    }
  }
});
async function broadcastState(storyId, stateLabel) {
  if (!storyId) {
    const state = await getPlayerState();
    storyId = state.storyId;
    stateLabel = state.isPlaying ? 'playing' : 'stopped';
  }
  const fullState = await getPlayerState();
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, {
          type: 'UPDATE_PLAYER_UI',
          storyId,
          state: stateLabel,
        })
        .catch(() => {});
    });
  });
  chrome.runtime
    .sendMessage({
      type: 'PLAYER_UPDATE',
      state: fullState,
    })
    .catch(() => {});
}
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'AUDIO_ERROR' && msg.error === 'NO_AUDIO_INSTANCE') {
    const state = await getPlayerState();
    if (state.audioUrl) {
      chrome.runtime.sendMessage({
        type: 'AUDIO_COMMAND',
        command: 'play',
        url: state.audioUrl,
        storyId: state.storyId,
        currentTime: state.currentTime,
      });
    }
  }
});
chrome.alarms.get('refreshPodcasts', (alarm) => {
  if (!alarm) {
    chrome.alarms.create('refreshPodcasts', { periodInMinutes: 1 });
  }
});
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refreshPodcasts') {
    chrome.tabs.query({ url: '*://news.ycombinator.com/*' }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_PODCASTS_UI' }).catch(() => {});
      });
    });
  }
});
