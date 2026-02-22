let audio = null;
let currentId = null;
setInterval(() => {
  if (audio && !audio.paused) {
    chrome.runtime.sendMessage({
      type: 'AUDIO_STATE_CHANGED',
      isPlaying: true,
      storyId: currentId,
      currentTime: audio.currentTime,
      duration: audio.duration || 0,
    });
  }
}, 500);
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'AUDIO_COMMAND') {
    if (msg.command === 'play') {
      if (audio) {
        audio.pause();
        audio = null;
      }
      audio = new Audio(msg.url);
      currentId = msg.storyId;
      const seekTime = msg.currentTime;
      audio.onplay = () => sendState(true);
      audio.onpause = () => {
        sendState(false);
      };
      audio.onended = () => sendState(false);
      audio.onerror = (_e) => {
        sendState(false);
      };
      if (seekTime && seekTime > 0) {
        audio.addEventListener(
          'loadedmetadata',
          () => {
            audio.currentTime = seekTime;
          },
          { once: true }
        );
      }
      audio
        .play()
        .then(() => {})
        .catch((_e) => {});
    } else if (msg.command === 'toggle') {
      if (audio) {
        if (audio.paused) audio.play();
        else audio.pause();
      } else {
        chrome.runtime.sendMessage({
          type: 'AUDIO_ERROR',
          error: 'NO_AUDIO_INSTANCE',
          storyId: currentId,
        });
      }
    } else if (msg.command === 'stop') {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        sendState(false);
      }
    }
  }
});
function sendState(isPlaying) {
  const time = audio ? audio.currentTime : 0;
  const dur = audio ? audio.duration || 0 : 0;
  chrome.runtime.sendMessage({
    type: 'AUDIO_STATE_CHANGED',
    isPlaying,
    storyId: currentId,
    currentTime: time,
    duration: dur,
  });
}
