'use strict';

console.log('Zenith Content Script Loaded');

// Listen for paste events
document.addEventListener('paste', () => {
  console.log('Paste event detected by Zenith');
  chrome.runtime.sendMessage({ type: 'PASTE_OCCURRED' });
}, true); // use capture to ensure we catch it
