// Initialize default settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['urlPatterns', 'deviceProfiles', 'urlProfileMap'], (result) => {
    // Always update device profiles to ensure the latest set is available
    chrome.storage.sync.set({
      urlPatterns: result.urlPatterns || [],
      deviceProfiles: {
        // Desktop Profiles
        'Chromebook': {
          width: 1366,
          height: 617,
          deviceScaleFactor: 1,
          mobile: false,
          userAgent: "Mozilla/5.0 (X11; CrOS x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
        },
        'Desktop': {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          mobile: false,
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
        },
        'Laptop': {
          width: 1280,
          height: 800,
          deviceScaleFactor: 1,
          mobile: false,
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
        },

        // Tablet Profiles
        'iPad': {
          width: 768,
          height: 1024,
          deviceScaleFactor: 2,
          mobile: true,
          userAgent: "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        },
        'iPad Pro': {
          width: 1024,
          height: 1366,
          deviceScaleFactor: 2,
          mobile: true,
          userAgent: "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        },
        'Galaxy Tab': {
          width: 800,
          height: 1280,
          deviceScaleFactor: 1.5,
          mobile: true,
          userAgent: "Mozilla/5.0 (Linux; Android 12; SM-T220) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
        },

        // Mobile Profiles
        'iPhone': {
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          mobile: true,
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        },
        'iPhone 13 Pro': {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          mobile: true,
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        },
        'Galaxy S21': {
          width: 360,
          height: 800,
          deviceScaleFactor: 3,
          mobile: true,
          userAgent: "Mozilla/5.0 (Linux; Android 12; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
        },
        'Pixel 6': {
          width: 412,
          height: 915,
          deviceScaleFactor: 2.6,
          mobile: true,
          userAgent: "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
        }
      },
      urlProfileMap: result.urlProfileMap || {}
    });
  });
});

// Keep track of tabs with active responsive mode
const activeResponsiveTabs = {};

// Create responsive mode overlay with iframe
function createResponsiveMode(tabId, profileName, profileSettings, iframeUrl) {
  chrome.scripting.executeScript({
    target: { tabId },
    function: (profile, settings, customUrl, tabIdentifier) => {
      // If there's already an overlay, just update the settings without recreating
      const existingOverlay = document.getElementById('responsive-mode-container');
      const existingIframe = document.getElementById('responsive-mode-frame');
      
      // Current URL to load in the iframe - use custom URL if provided
      const currentUrl = customUrl || window.location.href;
      
      if (existingOverlay && existingIframe) {
        // Just update the dimensions and info display
        const frameContainer = document.querySelector('#responsive-mode-container > div');
        if (frameContainer) {
          frameContainer.style.width = `${settings.width}px`;
          frameContainer.style.height = `${settings.height}px`;
          
          const infoDisplay = document.querySelector('#responsive-mode-container div[style*="position: absolute"]');
          if (infoDisplay) {
            infoDisplay.textContent = `${settings.width} x ${settings.height} (${profile})`;
          }
          
          // Update device selector if it exists
          const deviceSelect = document.querySelector('#responsive-mode-container select');
          if (deviceSelect) {
            for (let i = 0; i < deviceSelect.options.length; i++) {
              if (deviceSelect.options[i].value === profile) {
                deviceSelect.selectedIndex = i;
                break;
              }
            }
          }
          
          return true; // Successfully updated
        }
      }
      
      // Remove any existing overlay if we're recreating it
      if (existingOverlay) {
        existingOverlay.remove();
      }

      // Create container
      const container = document.createElement('div');
      container.id = 'responsive-mode-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: #000000;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        overflow: hidden;
      `;

      // Create frame container for proper sizing
      const frameContainer = document.createElement('div');
      frameContainer.style.cssText = `
        position: relative;
        width: ${settings.width}px;
        height: ${settings.height}px;
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        overflow: hidden;
      `;

      // Create the iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'responsive-mode-frame';
      iframe.src = currentUrl;
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        background-color: white;
      `;
      
      // Add a URL bar to show and control the current URL
      const urlBar = document.createElement('div');
      urlBar.style.cssText = `
        position: absolute;
        top: -60px;
        left: 0;
        right: 0;
        height: 30px;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        padding: 0 10px;
        box-sizing: border-box;
        z-index: 2147483647;
      `;
      
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.value = currentUrl;
      urlInput.style.cssText = `
        flex: 1;
        background-color: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 3px;
        padding: 5px 8px;
        font-size: 12px;
        margin-right: 5px;
      `;
      
      // Add a debug display
      const debugDisplay = document.createElement('div');
      debugDisplay.id = 'rcm-debug-display';
      debugDisplay.style.cssText = `
        position: absolute;
        bottom: 50px;
        left: 10px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-size: 12px;
        max-width: 400px;
        max-height: 200px;
        overflow: auto;
        z-index: 2147483647;
      `;
      
      // Function to log debug messages
      window.rcmDebug = function(message) {
        console.log('[RCM Debug]', message);
        const debugDisplay = document.getElementById('rcm-debug-display');
        if (debugDisplay) {
          const timestamp = new Date().toLocaleTimeString();
          const entry = document.createElement('div');
          entry.textContent = `${timestamp}: ${message}`;
          debugDisplay.appendChild(entry);
          
          // Limit entries to keep performance good
          while (debugDisplay.childNodes.length > 20) {
            debugDisplay.removeChild(debugDisplay.firstChild);
          }
          
          // Auto-scroll to bottom
          debugDisplay.scrollTop = debugDisplay.scrollHeight;
        }
      };
      
      // Add debug toggle button
      const debugBtn = document.createElement('button');
      debugBtn.textContent = '🐞 Debug';
      debugBtn.style.cssText = `
        background-color: #ff9800;
        color: white;
        border: none;
        border-radius: 3px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 5px;
      `;
      
      debugBtn.addEventListener('click', () => {
        const display = document.getElementById('rcm-debug-display');
        if (display.style.display === 'none') {
          display.style.display = 'block';
        } else {
          display.style.display = 'none';
        }
      });
      
      // Initially hide debug display
      debugDisplay.style.display = 'none';
      
      const goButton = document.createElement('button');
      goButton.textContent = 'Go';
      goButton.style.cssText = `
        background-color: #4285f4;
        color: white;
        border: none;
        border-radius: 3px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 12px;
      `;
      
      // Navigate to URL when Go button is clicked
      goButton.addEventListener('click', () => {
        const newUrl = urlInput.value.trim();
        if (newUrl) {
          window.rcmDebug(`Manual navigation to: ${newUrl}`);
          iframe.src = newUrl;
          // Update browser URL
          window.history.replaceState({}, '', newUrl);
        }
      });
      
      // Navigate when Enter key is pressed in URL input
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          goButton.click();
        }
      });
      
      urlBar.appendChild(urlInput);
      urlBar.appendChild(goButton);
      urlBar.appendChild(debugBtn);
      frameContainer.appendChild(urlBar);
      document.body.appendChild(debugDisplay);
      
      window.rcmDebug(`Responsive mode initialized with profile: ${profile}`);
      window.rcmDebug(`Initial URL: ${currentUrl}`);
      
      // Track iframe navigation using a combination of methods
      
      // Method 1: Load event listener
      iframe.addEventListener('load', () => {
        window.rcmDebug(`Iframe load event fired`);
        try {
          // Try to get the iframe URL (may fail with cross-origin)
          const iframeUrl = iframe.contentWindow.location.href;
          window.rcmDebug(`Successfully accessed iframe location: ${iframeUrl}`);
          urlInput.value = iframeUrl;
          window.history.replaceState({}, '', iframeUrl);
        } catch (e) {
          window.rcmDebug(`Cross-origin error: ${e.message}`);
          // If cross-origin, at least update with the src attribute
          window.rcmDebug(`Using iframe.src instead: ${iframe.src}`);
          urlInput.value = iframe.src;
          window.history.replaceState({}, '', iframe.src);
        }
      });
      
      // Method 2: MutationObserver to watch for src attribute changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
            const newSrc = iframe.src;
            window.rcmDebug(`MutationObserver detected src change: ${newSrc}`);
            urlInput.value = newSrc;
            window.history.replaceState({}, '', newSrc);
          }
        });
      });
      
      observer.observe(iframe, { attributes: true, attributeFilter: ['src'] });
      window.rcmDebug(`MutationObserver set up for iframe src changes`);
      
      // Method 3: Periodically check the iframe src
      const intervalId = setInterval(() => {
        const currentSrc = iframe.src;
        if (currentSrc !== urlInput.value) {
          window.rcmDebug(`Interval check detected src change: ${currentSrc}`);
          urlInput.value = currentSrc;
          window.history.replaceState({}, '', currentSrc);
        }
        
        // Also try to access contentWindow if possible
        try {
          const contentUrl = iframe.contentWindow.location.href;
          if (contentUrl !== urlInput.value) {
            window.rcmDebug(`Interval check detected contentWindow URL change: ${contentUrl}`);
            urlInput.value = contentUrl;
            window.history.replaceState({}, '', contentUrl);
          }
        } catch (e) {
          // Silently fail for cross-origin
        }
      }, 1000);
      
      window.rcmDebug(`Interval check set up for iframe URL changes`);

      // Create controls container
      const controlsContainer = document.createElement('div');
      controlsContainer.style.cssText = `
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        background-color: rgba(0, 0, 0, 0.7);
        padding: 8px 12px;
        border-radius: 20px;
        z-index: 2147483647;
      `;

      // Create device selector
      const deviceSelect = document.createElement('select');
      deviceSelect.style.cssText = `
        background-color: #333;
        color: white;
        border: 1px solid #666;
        border-radius: 3px;
        padding: 5px 10px;
        font-size: 14px;
      `;

      // Add orientation toggle button
      const orientationBtn = document.createElement('button');
      orientationBtn.textContent = '↺ Rotate';
      orientationBtn.style.cssText = `
        background-color: #4285f4;
        color: white;
        border: none;
        border-radius: 3px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 14px;
      `;
      
      // Add event listener to toggle orientation
      orientationBtn.addEventListener('click', () => {
        // Get current dimensions
        const currentWidth = frameContainer.style.width.replace('px', '');
        const currentHeight = frameContainer.style.height.replace('px', '');
        
        // Swap dimensions
        frameContainer.style.width = `${currentHeight}px`;
        frameContainer.style.height = `${currentWidth}px`;
        
        // Update info display
        infoDisplay.textContent = `${currentHeight} x ${currentWidth} (${profile})`;
      });

      // Create close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Close';
      closeBtn.style.cssText = `
        background-color: #ea4335;
        color: white;
        border: none;
        border-radius: 3px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 14px;
      `;
      
      // Add event listener to close responsive mode
      closeBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'disableResponsiveMode' });
      });

      // Add device profiles to selector
      chrome.storage.sync.get('deviceProfiles', (result) => {
        const profiles = result.deviceProfiles || {};
        
        Object.keys(profiles).forEach(profileName => {
          const option = document.createElement('option');
          option.value = profileName;
          option.textContent = profileName;
          if (profileName === profile) {
            option.selected = true;
          }
          deviceSelect.appendChild(option);
        });
      });
      
      // Add event listener to switch device profile
      deviceSelect.addEventListener('change', () => {
        const selectedProfile = deviceSelect.value;
        chrome.runtime.sendMessage({ 
          action: 'switchProfile', 
          profileName: selectedProfile 
        });
      });

      // Add controls to container
      controlsContainer.appendChild(deviceSelect);
      controlsContainer.appendChild(orientationBtn);
      controlsContainer.appendChild(closeBtn);

      // Add info display for dimensions
      const infoDisplay = document.createElement('div');
      infoDisplay.textContent = `${settings.width} x ${settings.height} (${profile})`;
      infoDisplay.style.cssText = `
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
      `;

      // Add elements to the DOM
      frameContainer.appendChild(infoDisplay);
      container.appendChild(frameContainer);
      container.appendChild(controlsContainer);
      frameContainer.appendChild(iframe);
      document.body.appendChild(container);

      // Store tab ID in window for message passing
      window.responsiveTabId = tabIdentifier;

      // Add keyboard shortcut to exit (Escape key)
      document.addEventListener('keydown', function escKeyHandler(e) {
        if (e.key === 'Escape') {
          chrome.runtime.sendMessage({ action: 'disableResponsiveMode' });
          document.removeEventListener('keydown', escKeyHandler);
        }
      });

      // Return success indicator
      return true;
    },
    args: [profileName, profileSettings, iframeUrl, tabId]
  }).then(results => {
    // Track this tab
    if (results && results[0]?.result) {
      activeResponsiveTabs[tabId] = {
        profileName,
        profileSettings,
        currentUrl: iframeUrl || null
      };
    }
  });
}

// Disable responsive mode
function disableResponsiveMode(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    function: () => {
      const container = document.getElementById('responsive-mode-container');
      if (container) {
        container.remove();
      }
    }
  }).then(() => {
    // Remove from tracked tabs
    delete activeResponsiveTabs[tabId];
  });
}

// Check if a URL matches patterns and enable responsive mode if so
function checkAndActivateResponsiveMode(tabId, url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return; // Skip Chrome internal pages or empty URLs
  }

  chrome.storage.sync.get(['urlPatterns', 'deviceProfiles', 'urlProfileMap'], (result) => {
    const patterns = result.urlPatterns || [];
    const profiles = result.deviceProfiles || {};
    const urlProfileMap = result.urlProfileMap || {};

    // Check if URL matches any pattern
    let matchFound = false;
    let matchedPattern = null;
    
    console.log("Checking URL:", url, "against patterns:", patterns);
    
    for (const pattern of patterns) {
      // Convert the pattern to a proper regex
      let regexPattern;
      
      if (pattern.endsWith('*')) {
        // Simple wildcard at the end
        const basePattern = pattern.slice(0, -1); // Remove the * at the end
        regexPattern = new RegExp('^' + escapeRegExp(basePattern) + '.*$');
      } else {
        // Exact match
        regexPattern = new RegExp('^' + escapeRegExp(pattern) + '$');
      }
      
      // Test the URL against the pattern
      if (regexPattern.test(url)) {
        matchFound = true;
        matchedPattern = pattern;
        console.log("Match found with pattern:", pattern);
        break;
      }
      
      // Also try matching just the hostname and path
      try {
        const urlObj = new URL(url);
        const hostAndPath = urlObj.hostname + urlObj.pathname;
        
        if (regexPattern.test(hostAndPath)) {
          matchFound = true;
          matchedPattern = pattern;
          console.log("Match found with hostname+path:", pattern);
          break;
        }
        
        // Try matching just the hostname
        if (regexPattern.test(urlObj.hostname)) {
          matchFound = true;
          matchedPattern = pattern;
          console.log("Match found with hostname:", pattern);
          break;
        }
      } catch (e) {
        console.error("Error parsing URL:", e);
      }
    }

    console.log("URL check result:", url, "Match found:", matchFound, "Pattern:", matchedPattern);

    if (matchFound && matchedPattern) {
      // Determine which profile to use based on the URL pattern mapping
      let profileName = urlProfileMap[matchedPattern];
      
      // If no specific mapping exists, use a default profile
      if (!profileName || !profiles[profileName]) {
        profileName = Object.keys(profiles)[0] || 'Desktop';
      }
      
      const profileSettings = profiles[profileName];
      
      if (profileSettings) {
        console.log("Activating responsive mode with profile:", profileName);
        // Apply responsive mode
        createResponsiveMode(tabId, profileName, profileSettings, null);
      }
    } else if (activeResponsiveTabs[tabId]) {
      // If URL doesn't match but responsive mode is active, disable it
      disableResponsiveMode(tabId);
    }
  });
}

// Helper function to escape special characters in regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // If we're already in responsive mode for this tab
    if (activeResponsiveTabs[tabId]) {
      const currentIframeUrl = activeResponsiveTabs[tabId].currentUrl;
      
      // If we have a tracked URL from the iframe and it doesn't match the tab URL,
      // we should restore the responsive mode with the iframe URL
      if (currentIframeUrl && currentIframeUrl !== tab.url) {
        const { profileName, profileSettings } = activeResponsiveTabs[tabId];
        createResponsiveMode(tabId, profileName, profileSettings, currentIframeUrl);
        return; // Skip the normal check
      }
    }
    
    // Normal check for new tabs or tabs without active responsive mode
    checkAndActivateResponsiveMode(tabId, tab.url);
  }
});

// Handle tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && tab.status === 'complete') {
      checkAndActivateResponsiveMode(activeInfo.tabId, tab.url);
    }
  });
});

// Handle tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeResponsiveTabs[tabId]) {
    delete activeResponsiveTabs[tabId];
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'switchProfile') {
    const tabId = sender.tab.id;
    const profileName = message.profileName;

    chrome.storage.sync.get(['deviceProfiles', 'urlProfileMap'], (result) => {
      const profiles = result.deviceProfiles || {};
      const profileSettings = profiles[profileName];

      if (profileSettings) {
        // Save profile preference for this URL
        if (sender.tab?.url) {
          try {
            const urlProfileMap = result.urlProfileMap || {};
            const hostname = new URL(sender.tab.url).hostname;
            urlProfileMap[hostname] = profileName;
            chrome.storage.sync.set({ urlProfileMap });
          } catch (e) {
            console.error('Error saving profile preference:', e);
          }
        }

        // Get current iframe URL if available
        const currentIframeUrl = activeResponsiveTabs[tabId]?.currentUrl;
        
        // Apply new profile settings with the current iframe URL
        createResponsiveMode(tabId, profileName, profileSettings, currentIframeUrl);
      }

      sendResponse({ success: true });
    });

    return true; // For async response
  }

  if (message.action === 'updateBrowserUrl') {
    const tabId = message.tabId;
    const url = message.url;
    
    if (tabId && url) {
      // Update the tab's URL in Chrome
      chrome.tabs.get(tabId, (tab) => {
        if (tab && tab.url !== url) {
          // Use executeScript to update the URL without refreshing
          chrome.scripting.executeScript({
            target: { tabId },
            function: (newUrl) => {
              if (window.location.href !== newUrl) {
                window.history.replaceState({}, '', newUrl);
              }
            },
            args: [url]
          });
          
          // Also update our tracking
          if (activeResponsiveTabs[tabId]) {
            activeResponsiveTabs[tabId].currentUrl = url;
          }
        }
      });
    }
    return true;
  }

  if (message.action === 'disableResponsiveMode') {
    const tabId = sender.tab.id;
    disableResponsiveMode(tabId);
    sendResponse({ success: true });
    return true;
  }

  return false;
});