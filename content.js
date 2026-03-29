// content.js

// Ask background for the current recommendation
chrome.runtime.sendMessage({ type: 'GET_RECOMMENDATION' }, ({ recommendation }) => {
    if (!recommendation) return;
    if (isExpired(recommendation.deadline)) return;
    injectBanner(recommendation);
});

function injectBanner(rec) {
    // Don't inject twice
    if (document.getElementById('rateready-banner')) return;

    const today     = new Date().toISOString().split('T')[0];
    const isToday   = rec.bestDate === today;
    const daysAway  = daysBetween(today, rec.bestDate);

    const banner = document.createElement('div');
    banner.id = 'rateready-banner';
    banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 999999;
    background: ${isToday ? '#16a34a' : '#4f46e5'};
    color: white; padding: 10px 20px;
    display: flex; align-items: center; justify-content: space-between;
    font-family: sans-serif; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;

    const message = isToday
        ? `Today is your optimal day to pay! Predicted rate: ${rec.predictedRate} ${rec.currency}/USD — est. savings $${rec.savings}`
        : `Better day to pay: ${rec.bestDate} (${daysAway} days away) — est. savings $${rec.savings} vs paying today`;

    banner.innerHTML = `
    <span>${message}</span>
    <button onclick="document.getElementById('rateready-banner').remove()"
      style="background:transparent;border:1px solid rgba(255,255,255,0.5);
             color:white;padding:4px 10px;border-radius:4px;cursor:pointer;
             font-size:12px;margin-left:16px;">
      Dismiss
    </button>
  `;

    document.body.prepend(banner);
    // Push page content down so banner doesn't cover it
    document.body.style.marginTop = '44px';
}

function daysBetween(a, b) {
    const diff = new Date(b) - new Date(a);
    return Math.round(diff / (1000 * 60 * 60 * 24));
}

function isExpired(deadline) {
    return new Date(deadline) < new Date();
}