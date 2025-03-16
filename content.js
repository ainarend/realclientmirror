// Simplified content script
// This file is minimal as the background script handles most functionality

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getTabInfo") {
        sendResponse({
            url: window.location.href,
            title: document.title
        });
    }

    return true;
});