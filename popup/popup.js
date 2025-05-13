document.addEventListener('DOMContentLoaded', () => {
  const productiveTimeEl = document.getElementById('productive-time');
  const unproductiveTimeEl = document.getElementById('unproductive-time');
  const progressBarEl = document.getElementById('progress-bar');
  const progressTextEl = document.getElementById('progress-text');
  const dashboardBtn = document.getElementById('dashboard-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsSection = document.getElementById('settings');
  const productiveSitesEl = document.getElementById('productive-sites');
  const saveSettingsBtn = document.getElementById('save-settings');
  
  // Load and display today's data
  loadTodayData();
  
  // Dashboard button
  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  });
  
  // Settings toggle
  settingsBtn.addEventListener('click', () => {
    settingsSection.classList.toggle('hidden');
    if (!settingsSection.classList.contains('hidden')) {
      loadSettings();
    }
  });
  
  // Save settings
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // Load today's time data
  function loadTodayData() {
    const today = new Date().toISOString().split('T')[0];
    
    chrome.storage.sync.get(['timeData'], (result) => {
      const timeData = result.timeData || {};
      const todayData = timeData[today] || { productive: 0, unproductive: 0 };
      
      productiveTimeEl.textContent = formatTime(todayData.productive);
      unproductiveTimeEl.textContent = formatTime(todayData.unproductive);
      
      const totalTime = todayData.productive + todayData.unproductive;
      if (totalTime > 0) {
        const productivePercentage = Math.round((todayData.productive / totalTime) * 100);
        progressBarEl.style.setProperty('--width', `${productivePercentage}%`);
        progressTextEl.textContent = `${productivePercentage}% Productive`;
        
        // Update progress bar color based on percentage
        if (productivePercentage >= 70) {
          progressBarEl.style.backgroundColor = '#4CAF50'; // Green
        } else if (productivePercentage >= 40) {
          progressBarEl.style.backgroundColor = '#FFC107'; // Yellow
        } else {
          progressBarEl.style.backgroundColor = '#F44336'; // Red
        }
      } else {
        progressBarEl.style.setProperty('--width', '0%');
        progressTextEl.textContent = 'No data today';
        progressBarEl.style.backgroundColor = '#e0e0e0';
      }
    });
  }
  
  // Load settings
  function loadSettings() {
    chrome.storage.sync.get(['productiveSites'], (result) => {
      productiveSitesEl.value = (result.productiveSites || []).join('\n');
    });
  }
  
  // Save settings
  function saveSettings() {
    const sites = productiveSitesEl.value
      .split('\n')
      .map(site => site.trim())
      .filter(site => site.length > 0);
    
    chrome.storage.sync.set({ productiveSites: sites }, () => {
      settingsSection.classList.add('hidden');
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon48.png',
        title: 'Settings Saved',
        message: 'Your productive websites list has been updated.'
      });
    });
  }
  
  // Format time in minutes/hours
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
  
  // Listen for data updates
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.timeData) {
      loadTodayData();
    }
  });
});