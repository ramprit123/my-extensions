// Listen for extension installation or update
chrome.runtime.onInstalled.addListener(function() {
  console.log('YouTube Bookmarker installed or updated');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_BOOKMARK') {
    // Handle new bookmark creation
    chrome.storage.sync.get([message.videoId], (data) => {
      const bookmarks = data[message.videoId] ? JSON.parse(data[message.videoId]) : [];
      chrome.storage.sync.set({
        [message.videoId]: JSON.stringify([...bookmarks, message.bookmark])
      });
    });
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com/watch')) {
    chrome.tabs.sendMessage(tabId, {
      type: 'NEW_VIDEO',
      videoId: new URLSearchParams(new URL(tab.url).search).get('v')
    });
  }
});