// background.js - Textorium 2.0 Service Worker

// Allows the popup to request opening the Side Panel, or configures panel behavior.
chrome.runtime.onInstalled.addListener(() => {
  console.log("Textorium 2.0 installed.");
});

// Handle requests to open the Side Panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openSidePanel" && chrome.sidePanel) {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          await chrome.sidePanel.open({ tabId: tab.id });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "No active tab found" });
        }
      } catch (err) {
        console.error("Failed to open side panel:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
