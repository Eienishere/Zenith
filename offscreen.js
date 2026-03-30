'use strict';

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === 'CLEAR_CLIPBOARD_WITH_DELAY') {
    const delay = msg.delay || 500;
    console.log(`Clearing clipboard in ${delay}ms...`);
    
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(' ');
        setTimeout(async () => {
          await navigator.clipboard.writeText('');
          console.log('Clipboard cleared successfully by Zenith');
        }, 50);
      } catch (err) {
        console.error('Offscreen clear failed:', err);
      }
    }, delay);
  }
});
