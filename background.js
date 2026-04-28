// background.js — OpenPane service worker

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.local.set({ collapsed: false, blockOverrides: {} });
  }
});
