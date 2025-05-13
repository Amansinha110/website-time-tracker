document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM elements
  const elements = {
    timeRange: document.getElementById('time-range'),
    totalProductive: document.getElementById('total-productive'),
    totalUnproductive: document.getElementById('total-unproductive'),
    productivePercent: document.getElementById('productive-percent'),
    unproductivePercent: document.getElementById('unproductive-percent'),
    dailyAverage: document.getElementById('daily-average'),
    averagePercent: document.getElementById('average-percent'),
    sitesList: document.getElementById('sites-list'),
    weeklyReportContent: document.getElementById('weekly-report-content'),
    generateReport: document.getElementById('generate-report')
  };

  let timeChart = null;
  let cachedData = null;

  // Load initial data
  loadData(7);

  // Event Listeners
  elements.timeRange.addEventListener('change', () => {
    const days = parseInt(elements.timeRange.value) || elements.timeRange.value;
    loadData(days);
  });

  elements.generateReport.addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage({ action: 'generateWeeklyReport' });
      loadWeeklyReport();
    } catch (error) {
      console.error('Error generating report:', error);
    }
  });

  // Load data for specified time range
  async function loadData(days) {
    try {
      if (days !== 'all' && (!Number.isInteger(days) || days < 1)) {
        throw new Error('Invalid days parameter');
      }

      const result = await chrome.storage.sync.get(['timeData']);
      const timeData = result.timeData || {};
      const dates = Object.keys(timeData).sort();

      if (dates.length === 0) {
        renderEmptyState();
        return;
      }

      const filteredDates = filterDates(dates, days);
      if (filteredDates.length === 0) {
        renderEmptyState();
        return;
      }

      const filteredData = filteredDates.map(date => timeData[date]);
      updateDashboard(filteredDates, filteredData);
    } catch (error) {
      console.error('Error loading data:', error);
      renderEmptyState();
    }
  }

  function filterDates(dates, days) {
    if (days === 'all') return dates;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return dates.filter(date => new Date(date) >= cutoffDate);
  }

  function updateDashboard(dates, data) {
    const { totalProductive, totalUnproductive } = calculateTotals(data);
    const totalTime = totalProductive + totalUnproductive;

    updateSummaryCards(totalProductive, totalUnproductive, totalTime);
    updateAverages(totalProductive, totalUnproductive, dates.length);
    createChart(dates, data);
    showTopSites(data);
  }

  function calculateTotals(data) {
    return data.reduce((acc, day) => ({
      totalProductive: acc.totalProductive + (day.productive || 0),
      totalUnproductive: acc.totalUnproductive + (day.unproductive || 0)
    }), { totalProductive: 0, totalUnproductive: 0 });
  }

  function updateSummaryCards(totalProductive, totalUnproductive, totalTime) {
    elements.totalProductive.textContent = formatTime(totalProductive);
    elements.totalUnproductive.textContent = formatTime(totalUnproductive);

    const productivePercentage = totalTime > 0 
      ? Math.round((totalProductive / totalTime) * 100)
      : 0;

    elements.productivePercent.textContent = `${productivePercentage}%`;
    elements.unproductivePercent.textContent = `${100 - productivePercentage}%`;
  }

  function createChart(dates, data) {
    const ctx = document.getElementById('timeChart').getContext('2d');
    
    if (timeChart) {
      timeChart.destroy();
    }

    const productiveData = data.map(day => Math.round((day.productive || 0) / 60));
    const unproductiveData = data.map(day => Math.round((day.unproductive || 0) / 60));

    timeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dates.map(date => formatDate(date)),
        datasets: [
          {
            label: 'Productive (minutes)',
            data: productiveData,
            backgroundColor: '#4CAF50',
            borderColor: '#388E3C',
            borderWidth: 1
          },
          {
            label: 'Unproductive (minutes)',
            data: unproductiveData,
            backgroundColor: '#F44336',
            borderColor: '#D32F2F', // Fixed missing quote
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: true },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Minutes'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Time Spent by Day'
          },
          tooltip: {
            callbacks: {
              afterBody: (context) => {
                const dayData = data[context[0].dataIndex];
                const total = (dayData.productive || 0) + (dayData.unproductive || 0);
                const productivePercent = total > 0 
                  ? Math.round((dayData.productive / total) * 100)
                  : 0;
                
                return [
                  `Productivity: ${productivePercent}%`,
                  `Total: ${formatTime(total)}`
                ];
              }
            }
          }
        }
      }
    });
  }

  // Helper functions remain the same
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function shortenSiteName(site) {
    return site.replace(/^www\./, '').replace(/\.com$/, '');
  }

  // ... rest of the code (showTopSites, loadWeeklyReport, renderEmptyState) remains the same ...
});