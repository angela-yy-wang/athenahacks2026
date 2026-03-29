# Kairos
> Pay your tuition at the right time — not just on time.

Exchange rates change daily. For international students paying large sums like tuition, even a small shift can mean hundreds to thousands of dollars lost. Kairos predicts the optimal day to pay based on your deadline and home currency, and surfaces the recommendation directly on your payment portal.

---

## How it works

1) Install the extension and enter your home currency, tuition amount, and payment deadline
2) Our ML model (Prophet) fetches real historical exchange rate data and forecasts the next 30–60 days
3) The extension shows a banner on your payment portal telling you the best day to pay and how much you could save
4) You decide when to pay, we just give you the information to make a smarter choice

---

## Stack

Layer | Tech
|---|---|
| Prediction API | Python, FastAPI, Prophet |
| Exchange Rate Data | Frankfurter.app |
| Chrome Extension | Manifest, JS |
---

## Setup


Run API in Terminal:
```
cd kairos
python3 -m venv venv 
source venv/bin/activate
pip install fastapi uvicorn prophet pandas requests
uvicorn predict:app --reload
```
You should see `INFO: Uvicorn running on http://127.0.0.1:8000` in terminal. 
<br/><br/>Confirm it's running at `http://127.0.0.1:8000`:
```
http://127.0.0.1:8000/best-day?currency=INR&amount=8000&days_ahead=30
```

### 2. Load the extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select this repo folder (exclude \_\_pycache__ or venv folders)
4. Pin the Kairos icon to your toolbar

### 3. Use it

1. Go to your payment portal
2. Click the Kairos icon
3. Select your home currency, enter your tuition amount and deadline
4. Click **Get recommendation**
5. Refresh the page — a banner will appear with your optimal pay date and estimated savings

---

## Supported currencies

| Currency | Code |
|---|---|
| Mexican Peso | MXN |
| Brazilian Real | BRL |
| Turkish Lira | TRY |
| Indian Rupee | INR |
| South Korean Won | KRW |
| Chinese Yuan | CNY |

---

## Why not just pay automatically?

University portals don't expose payment APIs, and automating cross-border transfers requires banking integrations that are out of scope for a student tool. Instead, we pass the responsibility to the human — if something unexpected happens (a geopolitical event, a sudden rate swing), you're always in control of when you actually pay.

This same approach applies beyond tuition: rent, flights home, any large payment with a deadline.

---
