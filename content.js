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
  background: ${isToday ? '#000' : '#111'};
  color: white;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: sans-serif;
  font-size: 13px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 2px solid ${isToday ? '#16a34a' : '#fff'};
  box-shadow: none;
`;

    const message = isToday
        ? `Today is your optimal day to pay! Predicted rate: ${rec.predictedRate} ${rec.currency}/USD — est. savings $${rec.savings}`
        : `Better day to pay: ${rec.bestDate} (${daysAway} days away) — est. savings $${rec.savings} vs paying today`;

    banner.innerHTML = `
    <span>${message}</span>
    <button onclick="document.getElementById('rateready-banner').remove()"
      style="background:transparent;border:2px solid rgba(255,255,255,0.4);
             color:white;padding:4px 14px;border-radius:0;cursor:pointer;
             font-size:11px;letter-spacing:0.08em;text-transform:uppercase;
             margin-left:16px;font-weight:700;">
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