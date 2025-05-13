# DEVELOP A CHROME EXTENSION THAT TRACKS THE TIME SPENT ON DIFFERENT WEBSITES AND PROVIDES REPORTS

*COMPANY*: CODTECH IT SOLUTIONS

*NAME*: AMAN KUMAR

*INTERN ID*: CT04DM776

*DOMAIN*: Full Stack Web Development

*DURATION*: 4 WEEKS

*MENTOR*: NEELA SANTOSH

"I am Aman Kumar is a dedicated developer, passionate about building smart solutions that enhance digital efficiency. Under the expert guidance of mentor Neela Santosh from CODTECH IT SOLUTIONS PVT. LTD., I am developing a Chrome extension that tracks time spent on various websites and provides insightful analytics to help users optimize their online activities."

Now, let’s outline the development process for your Website Time Tracker Chrome extension.

Key Features:
. Monitors time spent on different websites.
. Stores data locally for future reference.
. Provides a clean, user-friendly report through a popup interface.

Steps to Build the Extension
1)Create the manifest.json file (Defines extension properties)
2)Write the background.js script (Tracks website time in the background)
3)Design a popup.html interface (Displays time spent)
4)Develop a popup.js script (Loads and presents stored data)
5)Test & Debug (Ensure smooth functionality)

At the moment I am studying Rust for developing high-performance applications, as well as machine learning and neural networks.

```javascript
1>manifest.json
{
    "manifest_version": 3,
    "name": "Website Time Tracker",
    "version": "1.0",
    "description": "Track time spent on different websites.",
    "permissions": ["tabs", "storage"],
    "background": {
        "service_worker": "background.js"
    },
    "action": {
        "default_popup": "popup.html",
        "default_icon": "icon.png"
    }
}
```

```javascript
2>Background.js
let sites = {};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        let domain = new URL(tab.url).hostname;
        if (!sites[domain]) sites[domain] = { time: 0, lastVisit: Date.now() };
    }
});

setInterval(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length) {
            let domain = new URL(tabs[0].url).hostname;
            if (sites[domain]) sites[domain].time += 1;
            chrome.storage.local.set({ sites });
        }
    });
}, 60000); // Updates every minute
```
✅ Test locally and tweak functionality ✅ Add customizable user settings (e.g., alerts for excessive browsing) ✅ Implement graphical insights for better analytics
