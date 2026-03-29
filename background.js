// background.js
const API_URL = 'http://localhost:8000'; // swap for deployed URL

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCHEDULE_REMINDER') {
        fetchAndSchedule(message.settings);
    }
    if (message.type === 'GET_RECOMMENDATION') {
        // Content script is asking for the latest recommendation
        chrome.storage.local.get('recommendation', ({ recommendation }) => {
            sendResponse({ recommendation });
        });
        return true; // keep channel open for async response
    }
});

async function fetchAndSchedule(settings) {
    try {
        const { currency, amount, deadline, days } = settings;
        console.log('Kairos: fetching with settings', { currency, amount, deadline, days });
        const res = await fetch(
            `${API_URL}/best-day?currency=${currency}&amount=${amount}&deadline=${deadline}&days_ahead=${days}`
        );
        const data = await res.json();

        // Use server savings if available, fall back to client calculation
        const number = calculateSavings(amount, data);
        const savings = parseFloat(number.toFixed(2));
        console.log('rounded savings: ', savings);

        await chrome.storage.local.set({ recommendation: {
                bestDate:       data.best_date,
                predictedRate:  data.predicted_rate,
                confidenceLow:  data.confidence_low,
                confidenceHigh: data.confidence_high,
                todayRate:      data.today_rate,      // new field
                savings:        savings,     // now comes from server
                currency:       data.currency,
                deadline:       settings.deadline,
            }});

        const alarmTime = new Date(data.best_date);
        alarmTime.setHours(9, 0, 0, 0);
        chrome.alarms.clear('optimalDay');
        chrome.alarms.create('optimalDay', { when: alarmTime.getTime() });

    } catch (err) {
        console.error('Kairos: failed to fetch prediction', err);
    }
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== 'optimalDay') return;

    chrome.storage.local.get('recommendation', ({ recommendation }) => {
        if (!recommendation) return;
        chrome.notifications.create({
            type:    'basic',
            iconUrl: 'icons/icon.png',
            title:   'Kairos — Today is your best day to pay',
            message: `Predicted rate: ${recommendation.predictedRate}. ` +
                `Estimated savings: $${recommendation.savings}. ` +
                `Open your payment portal now.`,
        });
    });
});

function calculateSavings(amountUSD, data) {
    // How much more of the home currency is needed at today's rate vs optimal
    // data.predicted_rate is home/USD (e.g. INR per 1 USD)
    // Higher rate = student's currency is stronger = cheaper for them
    // This is a simplified estimate
    const today     = data["today_rate"];
    console.log('today: ', data["today_rate"]);
    const optimal   = data["predicted_rate"];
    console.log('optimal: ', optimal);
    const diff      = optimal - today;
    console.log('diff: ', diff);
    const savings   = (diff / today) * amountUSD;
    console.log('savings: ', savings);
    return Math.max(0, savings);
}