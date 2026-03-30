'use strict';

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['CLIPBOARD'],
    justification: 'To clear sensitive data from the clipboard'
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PASTE_OCCURRED') {
    chrome.storage.local.get(['passwordCopied', 'copyTime'], async (data) => {
      if (data.passwordCopied && data.copyTime && (Date.now() - data.copyTime < 300000)) {
        try {
          await ensureOffscreen();
          // Give it a tiny bit of time to initialize if it just opened
          setTimeout(() => {
            chrome.runtime.sendMessage({ type: 'CLEAR_CLIPBOARD_WITH_DELAY', delay: 800 });
          }, 100);
          chrome.storage.local.remove(['passwordCopied', 'copyTime']);
        } catch (e) { console.error(e); }
      }
    });
  } else if (msg.type === 'MANUAL_CLEAR') {
    (async () => {
      try {
        await ensureOffscreen();
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: 'CLEAR_CLIPBOARD_WITH_DELAY', delay: 0 });
        }, 100);
      } catch (e) { console.error(e); }
    })();
  }
  return true;
});
