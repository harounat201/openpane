// background.js — OpenPane service worker

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.local.set({
      collapsed: false,
      droppedBlocks: [],
      blockOrder: [],
      blockPriorities: {},
      pinnedBlocks: [],
    });
  }
});

// Relay stats from content script to popup
const tabStats = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'stats-update' && sender.tab?.id) {
    tabStats.set(sender.tab.id, message.stats);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'get-stats') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const stats = tabs[0] ? (tabStats.get(tabs[0].id) ?? null) : null;
      sendResponse({ stats });
    });
    return true; // async response
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStats.delete(tabId);
});
