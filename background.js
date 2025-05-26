// Initialize default categories on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("categories", ({ categories }) => {
    if (!categories) {
      chrome.storage.sync.set({
        categories: ["learning", "news", "stock", "other"],
      });
    }
  });
});

// Store API key securely
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SET_API_KEY") {
    chrome.storage.sync.set({ openRouterApiKey: request.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.type === "GET_API_KEY") {
    chrome.storage.sync.get("openRouterApiKey", (data) => {
      sendResponse({ apiKey: data.openRouterApiKey || null });
    });
    return true;
  }
});
