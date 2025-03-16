document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Add URL pattern button
  document.getElementById('add-pattern').addEventListener('click', () => {
    const patternInput = document.getElementById('url-pattern');
    const pattern = patternInput.value.trim();
    const profileSelect = document.getElementById('profile-select');
    const selectedProfile = profileSelect.value;

    if (pattern) {
      chrome.storage.sync.get(['urlPatterns', 'urlProfileMap'], (result) => {
        const patterns = result.urlPatterns || [];
        const urlProfileMap = result.urlProfileMap || {};
        
        if (!patterns.includes(pattern)) {
          patterns.push(pattern);
          // Map this pattern to the currently selected profile
          urlProfileMap[pattern] = selectedProfile;
          
          chrome.storage.sync.set({ 
            urlPatterns: patterns,
            urlProfileMap: urlProfileMap 
          }, () => {
            patternInput.value = '';
            updatePatternList();
          });
        }
      });
    }
  });

  // Profile selector change handler
  document.getElementById('profile-select').addEventListener('change', () => {
    document.getElementById('delete-profile').disabled =
        ['Chromebook', 'iPad', 'iPhone'].includes(document.getElementById('profile-select').value);
  });

  // Edit profile button
  document.getElementById('edit-profile').addEventListener('click', () => {
    const profileEditor = document.getElementById('profile-editor');
    profileEditor.style.display = 'block';

    const profileSelect = document.getElementById('profile-select');
    const selectedProfile = profileSelect.value;

    chrome.storage.sync.get('deviceProfiles', (result) => {
      const profiles = result.deviceProfiles || {};
      const profile = profiles[selectedProfile];

      if (profile) {
        document.getElementById('profile-name').value = selectedProfile;
        document.getElementById('profile-width').value = profile.width;
        document.getElementById('profile-height').value = profile.height;
        document.getElementById('profile-scale').value = profile.deviceScaleFactor || 1;
        document.getElementById('profile-mobile').checked = profile.mobile || false;
        document.getElementById('profile-useragent').value = profile.userAgent || '';

        // Disable profile name field for default profiles
        const profileNameField = document.getElementById('profile-name');
        if (['Chromebook', 'iPad', 'iPhone'].includes(selectedProfile)) {
          profileNameField.disabled = true;
        } else {
          profileNameField.disabled = false;
        }
      }
    });
  });

  // Add new profile button
  document.getElementById('add-profile').addEventListener('click', () => {
    const profileEditor = document.getElementById('profile-editor');
    profileEditor.style.display = 'block';

    // Clear and enable all fields
    document.getElementById('profile-name').value = '';
    document.getElementById('profile-name').disabled = false;
    document.getElementById('profile-width').value = '';
    document.getElementById('profile-height').value = '';
    document.getElementById('profile-scale').value = '1';
    document.getElementById('profile-mobile').checked = false;
    document.getElementById('profile-useragent').value = '';
  });

  // Delete profile button
  document.getElementById('delete-profile').addEventListener('click', () => {
    const profileSelect = document.getElementById('profile-select');
    const selectedProfile = profileSelect.value;

    // Don't allow deletion of default profiles
    if (['Chromebook', 'iPad', 'iPhone'].includes(selectedProfile)) {
      return;
    }

    if (confirm(`Are you sure you want to delete the "${selectedProfile}" profile?`)) {
      chrome.storage.sync.get('deviceProfiles', (result) => {
        const profiles = result.deviceProfiles || {};
        delete profiles[selectedProfile];

        chrome.storage.sync.set({ deviceProfiles: profiles }, () => {
          updateProfileSelect();
        });
      });
    }
  });

  // Cancel profile editing
  document.getElementById('cancel-profile').addEventListener('click', () => {
    document.getElementById('profile-editor').style.display = 'none';
  });

  // Save profile button
  document.getElementById('save-profile').addEventListener('click', () => {
    const profileName = document.getElementById('profile-name').value.trim();
    const width = parseInt(document.getElementById('profile-width').value);
    const height = parseInt(document.getElementById('profile-height').value);
    const scale = parseFloat(document.getElementById('profile-scale').value) || 1;
    const mobile = document.getElementById('profile-mobile').checked;
    const userAgent = document.getElementById('profile-useragent').value.trim();
    const orientation = document.getElementById('profile-orientation').value;

    if (profileName && width && height) {
      chrome.storage.sync.get('deviceProfiles', (result) => {
        const profiles = result.deviceProfiles || {};
        
        // Apply orientation if needed
        let finalWidth = width;
        let finalHeight = height;
        if (orientation === 'landscape' && width < height) {
          // Swap dimensions for landscape
          finalWidth = height;
          finalHeight = width;
        } else if (orientation === 'portrait' && width > height) {
          // Swap dimensions for portrait
          finalWidth = height;
          finalHeight = width;
        }
        
        // Save the profile
        profiles[profileName] = {
          width: finalWidth,
          height: finalHeight,
          deviceScaleFactor: scale,
          mobile: mobile,
          userAgent: userAgent || undefined
        };
        
        chrome.storage.sync.set({ deviceProfiles: profiles }, () => {
          document.getElementById('profile-editor').style.display = 'none';
          updateProfileSelect();
        });
      });
    }
  });
});

function loadSettings() {
  updatePatternList();
  updateProfileSelect();
}

function updatePatternList() {
  const patternList = document.getElementById('pattern-list');
  patternList.innerHTML = '';

  chrome.storage.sync.get(['urlPatterns', 'urlProfileMap', 'deviceProfiles'], (result) => {
    const patterns = result.urlPatterns || [];
    const urlProfileMap = result.urlProfileMap || {};
    const profiles = result.deviceProfiles || {};

    if (patterns.length === 0) {
      patternList.innerHTML = '<p>No patterns added yet.</p>';
      return;
    }

    patterns.forEach(pattern => {
      const item = document.createElement('div');
      item.className = 'url-item';

      // Create pattern text
      const patternText = document.createElement('span');
      patternText.textContent = pattern;
      
      // Create profile selector for this pattern
      const profileSelector = document.createElement('select');
      profileSelector.className = 'pattern-profile-select';
      profileSelector.dataset.pattern = pattern;
      
      // Add options for each profile
      Object.keys(profiles).forEach(profileName => {
        const option = document.createElement('option');
        option.value = profileName;
        option.textContent = profileName;
        if (urlProfileMap[pattern] === profileName) {
          option.selected = true;
        }
        profileSelector.appendChild(option);
      });
      
      // Handle profile change for this pattern
      profileSelector.addEventListener('change', () => {
        chrome.storage.sync.get('urlProfileMap', (result) => {
          const urlProfileMap = result.urlProfileMap || {};
          urlProfileMap[pattern] = profileSelector.value;
          chrome.storage.sync.set({ urlProfileMap });
        });
      });

      // Create remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        chrome.storage.sync.get(['urlPatterns', 'urlProfileMap'], (result) => {
          const currentPatterns = result.urlPatterns || [];
          const currentMap = result.urlProfileMap || {};
          
          // Remove pattern from list and mapping
          const updatedPatterns = currentPatterns.filter(p => p !== pattern);
          delete currentMap[pattern];
          
          chrome.storage.sync.set({ 
            urlPatterns: updatedPatterns,
            urlProfileMap: currentMap
          }, () => {
            updatePatternList();
          });
        });
      });

      // Add elements to item
      const patternInfo = document.createElement('div');
      patternInfo.className = 'pattern-info';
      patternInfo.appendChild(patternText);
      
      const controls = document.createElement('div');
      controls.className = 'pattern-controls';
      controls.appendChild(profileSelector);
      controls.appendChild(removeBtn);
      
      item.appendChild(patternInfo);
      item.appendChild(controls);
      patternList.appendChild(item);
    });
  });
}

function updateProfileSelect() {
  const profileSelect = document.getElementById('profile-select');
  profileSelect.innerHTML = '';

  chrome.storage.sync.get('deviceProfiles', (result) => {
    const profiles = result.deviceProfiles || {};

    Object.keys(profiles).forEach(profile => {
      const option = document.createElement('option');
      option.value = profile;
      // Use proper multiplication symbol for display
      option.textContent = `${profile} (${profiles[profile].width} x ${profiles[profile].height})`;
      profileSelect.appendChild(option);
    });

    // Update delete button state
    document.getElementById('delete-profile').disabled =
        ['Chromebook', 'iPad', 'iPhone'].includes(profileSelect.value);
  });
}