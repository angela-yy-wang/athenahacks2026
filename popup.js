// popup/popup.js
const rawDeadline = document.getElementById('deadline').value;
const normalized = new Date(rawDeadline).toISOString().split('T')[0];
settings.deadline = normalized;

document.getElementById('save').addEventListener('click', async () => {
    const settings = {
        currency: document.getElementById('currency').value,
        amount:   parseFloat(document.getElementById('amount').value),
        deadline: document.getElementById('deadline').value,
        days:     parseInt(document.getElementById('days').value),
    };

    await chrome.storage.sync.set({ settings });

    // Ask background script to fetch prediction + set alarm
    chrome.runtime.sendMessage({ type: 'SCHEDULE_REMINDER', settings });

    document.getElementById('status').style.display = 'block';
});

// Load saved settings on open
chrome.storage.sync.get('settings', ({ settings }) => {
    if (!settings) return;
    document.getElementById('currency').value = settings.currency;
    document.getElementById('amount').value   = settings.amount;
    document.getElementById('deadline').value = settings.deadline;
    document.getElementById('days').value     = settings.days;
});