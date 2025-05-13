// Default productive websites list
const DEFAULT_PRODUCTIVE_SITES = [
  "github.com",
  "stackoverflow.com",
  "developer.mozilla.org",
  "leetcode.com",
  "codecademy.com",
  "udemy.com",
  "coursera.org",
  "edx.org",
  "freecodecamp.org",
  "medium.com/tech",
  "dev.to",
  "hashnode.com",
  "css-tricks.com",
  "codepen.io",
  "repl.it",
  "glitch.com",
  "notion.so",
  "trello.com",
  "atlassian.com",
  "google.com/docs",
  "google.com/sheets",
  "google.com/slides",
  "docs.microsoft.com",
  "aws.amazon.com",
  "cloud.google.com"
];

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['productiveSites', 'timeData'], (result) => {
    if (!result.productiveSites) {
      chrome.storage.sync.set({ productiveSites: DEFAULT_PRODUCTIVE_SITES });
    }
    if (!result.timeData) {
      chrome.storage.sync.set({ timeData: {} });
    }
  });
});

// Track active tab time
let activeTabId = null;
let activeTabUrl = null;
let activeTabStartTime = null;
let isIdle = false;

// Check for idle state every 30 seconds
chrome.idle.setDetectionInterval(30);
chrome.idle.onStateChanged.addListener((state) => {
  isIdle = state === "idle" || state === "locked";
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  trackActiveTabChange(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    trackActiveTabChange(tabId);
  }
});

function trackActiveTabChange(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (!tab.url) return;

    // Save previous tab's time
    if (activeTabId !== null && activeTabUrl !== null && activeTabStartTime !== null && !isIdle) {
      saveTimeSpent(activeTabUrl, activeTabStartTime, Date.now());
    }

    // Set new active tab
    activeTabId = tabId;
    activeTabUrl = new URL(tab.url).hostname;
    activeTabStartTime = Date.now();
  });
}

// Save time when window loses focus
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus
    if (activeTabId !== null && activeTabUrl !== null && activeTabStartTime !== null && !isIdle) {
      saveTimeSpent(activeTabUrl, activeTabStartTime, Date.now());
      activeTabStartTime = null;
    }
  } else {
    // Window gained focus
    if (activeTabId !== null && activeTabUrl !== null) {
      activeTabStartTime = Date.now();
    }
  }
});

// Save time spent on a website
function saveTimeSpent(hostname, startTime, endTime) {
  const timeSpent = Math.round((endTime - startTime) / 1000); // in seconds
  if (timeSpent < 5) return; // Ignore very short visits

  const today = new Date().toISOString().split('T')[0];
  
  chrome.storage.sync.get(['productiveSites', 'timeData'], (result) => {
    const productiveSites = result.productiveSites || DEFAULT_PRODUCTIVE_SITES;
    const timeData = result.timeData || {};
    
    const isProductive = productiveSites.some(site => hostname.includes(site));
    const category = isProductive ? 'productive' : 'unproductive';
    
    // Initialize day data if not exists
    if (!timeData[today]) {
      timeData[today] = {
        productive: 0,
        unproductive: 0,
        sites: {}
      };
    }
    
    // Update category time
    timeData[today][category] += timeSpent;
    
    // Update site time
    if (!timeData[today].sites[hostname]) {
      timeData[today].sites[hostname] = {
        time: 0,
        category: category
      };
    }
    timeData[today].sites[hostname].time += timeSpent;
    
    // Save updated data
    chrome.storage.sync.set({ timeData: timeData });
    
    // Update badge
    updateBadge(timeData[today]);
  });
}

// Update extension badge with today's productive time percentage
function updateBadge(todayData) {
  const totalTime = todayData.productive + todayData.unproductive;
  if (totalTime === 0) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  
  const productivePercentage = Math.round((todayData.productive / totalTime) * 100);
  chrome.action.setBadgeText({ text: `${productivePercentage}%` });
  
  // Set badge color based on productivity
  const color = productivePercentage >= 50 ? '#4CAF50' : '#F44336';
  chrome.action.setBadgeBackgroundColor({ color: color });
}

// Weekly report alarm
chrome.alarms.create('weeklyReport', {
  periodInMinutes: 60 * 24 * 7 // 1 week
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'weeklyReport') {
    generateWeeklyReport();
  }
});

function generateWeeklyReport() {
  chrome.storage.sync.get(['timeData'], (result) => {
    const timeData = result.timeData || {};
    const dates = Object.keys(timeData).sort();
    
    if (dates.length === 0) return;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyData = dates.filter(date => new Date(date) >= oneWeekAgo)
      .map(date => timeData[date]);
    
    const totalProductive = weeklyData.reduce((sum, day) => sum + day.productive, 0);
    const totalUnproductive = weeklyData.reduce((sum, day) => sum + day.unproductive, 0);
    const totalTime = totalProductive + totalUnproductive;
    const productivePercentage = totalTime > 0 ? Math.round((totalProductive / totalTime) * 100) : 0;
    
    // Get top 5 sites
    const allSites = {};
    weeklyData.forEach(day => {
      Object.entries(day.sites).forEach(([site, data]) => {
        if (!allSites[site]) {
          allSites[site] = { time: 0, category: data.category };
        }
        allSites[site].time += data.time;
      });
    });
    
    const topSites = Object.entries(allSites)
      .sort((a, b) => b[1].time - a[1].time)
      .slice(0, 5);
    
    // Create notification
    chrome.notifications.create('weeklyReport', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Weekly Productivity Report',
      message: `You spent ${formatTime(totalProductive)} on productive sites (${productivePercentage}%) and ${formatTime(totalUnproductive)} on unproductive sites.`,
      contextMessage: 'Click to view details in dashboard',
      priority: 2
    });
    
    // Store report for dashboard
    chrome.storage.local.set({ 
      weeklyReport: {
        productive: totalProductive,
        unproductive: totalUnproductive,
        topSites: topSites
      }
    });
  });
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}