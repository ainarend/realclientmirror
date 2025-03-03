// Add debugging helper for storage
function logStoredSites() {
  chrome.storage.sync.get(['sites'], function(result) {
    console.log('Currently stored sites:', result.sites || []);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Load saved configurations
  loadSavedConfigurations();

  // Save button click event
  document.getElementById('saveBtn').addEventListener('click', saveConfiguration);

  // Preset device selection change event
  document.getElementById('presetDevice').addEventListener('change', handlePresetChange);

  // Log current storage for debugging (only in console)
  logStoredSites();
});

function handlePresetChange() {
  const presetSelect = document.getElementById('presetDevice');
  const selectedValue = presetSelect.value;

  if (selectedValue) {
    // Dimensions based on selected device
    const deviceDimensions = {
      // Educational Devices
      'chromebook-11': { width: 1366, height: 768 },
      'chromebook-14': { width: 1920, height: 1080 },
      'school-desktop': { width: 1280, height: 1024 },

      // Tablets
      'ipad-10': { width: 1620, height: 2160 },
      'ipad-11': { width: 1668, height: 2388 },
      'android-tablet': { width: 1200, height: 1920 },

      // Phones
      'iphone-15': { width: 390, height: 844 },
      'iphone-15pro': { width: 430, height: 932 },
      'android-phone': { width: 360, height: 800 },
      'android-large': { width: 412, height: 915 },

      // Desktop Screens
      'desktop-hd': { width: 1920, height: 1080 },
      'desktop-2k': { width: 2560, height: 1440 },
      'desktop-4k': { width: 3840, height: 2160 },
    };

    // Set the input field values
    if (deviceDimensions[selectedValue]) {
      document.getElementById('width').value = deviceDimensions[selectedValue].width;
      document.getElementById('height').value = deviceDimensions[selectedValue].height;
    }
  }
}

function saveConfiguration() {
  let siteUrl = document.getElementById('siteUrl').value.trim();
  const width = document.getElementById('width').value;
  const height = document.getElementById('height').value;
  const presetDevice = document.getElementById('presetDevice').value;

  // Validation
  if (!siteUrl) {
    alert('Please enter a website URL pattern');
    return;
  }

  if (!width || !height) {
    alert('Please enter both width and height');
    return;
  }

  // Remove http://, https:// and www. from the URL to simplify matching
  siteUrl = siteUrl.replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '');

  console.log('Saving configuration for site URL:', siteUrl);

  // Save configuration
  chrome.storage.sync.get(['sites'], function(result) {
    const sites = result.sites || [];

    // Check if site already exists
    const existingIndex = sites.findIndex(site => site.url === siteUrl);

    // Get the preset name if selected
    const presetName = document.getElementById('presetDevice').options[
        document.getElementById('presetDevice').selectedIndex
        ].text;

    const configToSave = {
      url: siteUrl,
      width: parseInt(width),
      height: parseInt(height),
      preset: presetDevice ? presetName : 'Custom'
    };

    if (existingIndex >= 0) {
      // Update existing site
      sites[existingIndex] = configToSave;
    } else {
      // Add new site
      sites.push(configToSave);
    }

    // Save to storage
    chrome.storage.sync.set({ sites: sites }, function() {
      // Clear inputs
      document.getElementById('siteUrl').value = '';
      document.getElementById('width').value = '';
      document.getElementById('height').value = '';
      document.getElementById('presetDevice').value = '';

      // Reload the list
      loadSavedConfigurations();
    });
  });
}

function loadSavedConfigurations() {
  const sitesList = document.getElementById('sitesList');
  sitesList.innerHTML = '';

  chrome.storage.sync.get(['sites'], function(result) {
    const sites = result.sites || [];

    if (sites.length === 0) {
      sitesList.innerHTML = '<p>No configurations saved yet.</p>';
      return;
    }

    sites.forEach(function(site, index) {
      const siteItem = document.createElement('div');
      siteItem.className = 'site-item';

      const siteDetails = document.createElement('div');
      siteDetails.className = 'site-details';
      // Use standard "x" instead of "×" to avoid encoding issues
      siteDetails.textContent = `${site.url} (${site.width}x${site.height})${site.preset ? ` - ${site.preset}` : ''}`;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function() {
        deleteSite(index);
      });

      siteItem.appendChild(siteDetails);
      siteItem.appendChild(deleteBtn);
      sitesList.appendChild(siteItem);
    });
  });
}

function deleteSite(index) {
  chrome.storage.sync.get(['sites'], function(result) {
    const sites = result.sites || [];

    sites.splice(index, 1);

    chrome.storage.sync.set({ sites: sites }, function() {
      loadSavedConfigurations();
    });
  });
}