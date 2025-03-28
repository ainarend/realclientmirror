document.addEventListener('DOMContentLoaded', function() {
    // Button to force resize current tab
    document.getElementById('applyCustomResizeBtn').addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                // Get the URL of the current tab
                const currentUrl = tabs[0].url;
                const currentHostname = new URL(currentUrl).hostname;

                // Get stored domain presets
                chrome.storage.sync.get(['domainPresets'], function(result) {
                    const domainPresets = result.domainPresets || {};

                    // Clean hostname for matching
                    const cleanHostname = currentHostname.replace(/^www\./i, '');

                    // Find matching domain preset
                    let matchingDomain = null;

                    // First, try exact match
                    if (domainPresets[cleanHostname]) {
                        matchingDomain = cleanHostname;
                    } else {
                        // Try wildcard matching
                        for (const domain in domainPresets) {
                            if (domain.includes('*')) {
                                const pattern = domain.replace(/\./g, '\\.').replace(/\*/g, '.*');
                                const regex = new RegExp(`^${pattern}$`);
                                if (regex.test(cleanHostname)) {
                                    matchingDomain = domain;
                                    break;
                                }
                            } else if (cleanHostname.includes(domain)) {
                                // Substring match as fallback
                                matchingDomain = domain;
                                break;
                            }
                        }
                    }

                    if (matchingDomain && domainPresets[matchingDomain].activePreset) {
                        const activePresetName = domainPresets[matchingDomain].activePreset;
                        const matchingPreset = domainPresets[matchingDomain].presets.find(
                            preset => preset.name === activePresetName
                        );

                        if (matchingPreset) {
                            // Create and inject the iframe script
                            chrome.scripting.executeScript({
                                target: { tabId: tabs[0].id },
                                func: function(width, height, presetName, domain) {
                                    // Check if we should skip the resizing (used by exit button)
                                    if (sessionStorage.getItem('skipSiteResizer') === 'true') {
                                        console.log("Skipping site resizer due to exit flag");
                                        sessionStorage.removeItem('skipSiteResizer');
                                        return false;
                                    }

                                    // Add a close button to exit the simulation
                                    const closeButton = document.createElement('button');
                                    closeButton.id = 'rcm-close-button';
                                    closeButton.textContent = '✕ Exit Simulation';
                                    closeButton.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: rgba(234, 67, 53, 0.8);
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 5px;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    cursor: pointer;
                    z-index: 2147483647;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                  `;
                                    closeButton.onclick = function() {
                                        // Set a flag in session storage to skip resizing on next load
                                        sessionStorage.setItem('skipSiteResizer', 'true');
                                        // Reload the page to exit the simulation
                                        window.location.reload();
                                    };

                                    // Add simulation indicator bar
                                    const simulationBar = document.createElement('div');
                                    simulationBar.id = 'rcm-simulation-bar';
                                    simulationBar.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background-color: rgba(0,0,0,0.7);
                    color: white;
                    text-align: center;
                    padding: 2px 0;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    z-index: 2147483647;
                  `;
                                    simulationBar.textContent = `RealClient Mirror: ${domain} - ${presetName}`;

                                    // Use a consistent iframe approach
                                    // 1. Create dark background container
                                    const container = document.createElement('div');
                                    container.id = 'rcm-container';
                                    container.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: #333;
                    z-index: 2147483640;
                  `;

                                    // 2. Create an iframe wrapper to maintain the exact dimensions
                                    const iframeWrapper = document.createElement('div');
                                    iframeWrapper.id = 'rcm-iframe-wrapper';
                                    iframeWrapper.style.cssText = `
                    width: ${width}px;
                    height: ${height}px;
                    overflow: hidden;
                    background: white;
                    box-shadow: 0 0 20px rgba(0,0,0,0.5);
                    margin: 20px 0;
                  `;

                                    // 3. Create an iframe to load the current page
                                    const iframe = document.createElement('iframe');
                                    iframe.id = 'rcm-iframe';
                                    iframe.src = window.location.href; // Current URL
                                    iframe.style.cssText = `
                    width: 100%;
                    height: 100%;
                    border: none;
                  `;

                                    // Assemble the elements
                                    document.body.appendChild(container);
                                    container.appendChild(simulationBar);
                                    container.appendChild(iframeWrapper);
                                    iframeWrapper.appendChild(iframe);
                                    container.appendChild(closeButton);

                                    // Clear body content and styles that might interfere
                                    document.body.style.margin = '0';
                                    document.body.style.padding = '0';
                                    document.body.style.overflow = 'hidden';

                                    return true;
                                },
                                args: [
                                    matchingPreset.width,
                                    matchingPreset.height,
                                    matchingPreset.name,
                                    matchingDomain
                                ]
                            }).then(results => {
                                document.getElementById('storageOutput').textContent =
                                    `Applied preset: ${matchingPreset.name} (${matchingPreset.width}x${matchingPreset.height})`;
                            }).catch(err => {
                                document.getElementById('storageOutput').textContent =
                                    `Error executing resize script: ${err.message}`;
                            });
                        } else {
                            document.getElementById('storageOutput').textContent =
                                `No active preset found for ${currentHostname}`;
                        }
                    } else {
                        document.getElementById('storageOutput').textContent =
                            `No configuration found for ${currentHostname}`;
                    }
                });
            }
        });
    });

    // Button to check storage
    document.getElementById('checkStorageBtn').addEventListener('click', function() {
        chrome.storage.sync.get(['domainPresets'], function(result) {
            const domainPresets = result.domainPresets || {};
            document.getElementById('storageOutput').textContent = JSON.stringify(domainPresets, null, 2);
        });
    });

    // Button to clear storage
    document.getElementById('clearStorageBtn').addEventListener('click', function() {
        if (confirm("Are you sure you want to clear all domain presets?")) {
            chrome.storage.sync.clear(function() {
                document.getElementById('storageOutput').textContent = "All configurations cleared!";
            });
        }
    });
});