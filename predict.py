# api/predict.py — run with: uvicorn predict:app --reload
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from prophet import Prophet
import pandas as pd
import requests
from datetime import date, datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ── helpers ──────────────────────────────────────────────────────────────────

def fetch_rates(home_currency: str) -> pd.DataFrame:
    """
    Always fetches home_currency → USD.
    A higher rate means the student's currency buys more USD — cheaper to pay.
    frankfurter.app uses USD as base so we fetch USD/home and invert.
    """
    today = date.today().isoformat()
    url = f"https://api.frankfurter.app/2024-01-01..{today}?from=USD&to={home_currency}"
    response = requests.get(url, timeout=10)

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Exchange rate API unavailable")

    raw = response.json().get("rates", {})
    if not raw:
        raise HTTPException(status_code=502, detail="No rate data returned")

    rows = [
        {"ds": date_str, "y": vals[home_currency]}
        for date_str, vals in raw.items()
        if home_currency in vals
    ]

    df = pd.DataFrame(rows)
    df["ds"] = pd.to_datetime(df["ds"])
    df["y"] = pd.to_numeric(df["y"])
    return df.sort_values("ds").reset_index(drop=True)


def estimate_savings(amount_usd: float, today_rate: float, optimal_rate: float) -> float:
    """
    Both rates are USD → home_currency (e.g. 1 USD = 83.2 INR).
    Higher rate = student gets more home currency per USD spent = cheaper for them.
    Savings = how much less home currency they need to cover amount_usd.
    """
    if today_rate == 0 or optimal_rate == 0:
        return 0.0
    cost_today   = amount_usd * today_rate
    cost_optimal = amount_usd * optimal_rate
    savings_home_currency = cost_today - cost_optimal

    # Convert savings back to USD for a universal display value
    savings_usd = savings_home_currency / today_rate
    return round(max(0.0, savings_usd), 2)


# ── endpoint ─────────────────────────────────────────────────────────────────

@app.get("/best-day")
def best_day(
        currency:   str   = "INR",   # student's home currency — matches popup dropdown
        amount:     float = 0.0,     # tuition amount in USD — for savings calc
        days_ahead: int   = 30,      # look-ahead window from popup settings
        deadline:   str   = "",      # ISO date string e.g. "2026-05-15"
):
    df = fetch_rates(currency)

    m = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=True,
    )
    m.fit(df)

    future   = m.make_future_dataframe(periods=days_ahead)
    forecast = m.predict(future)

    # Only look at future dates
    today_ts  = pd.Timestamp.today().normalize()
    upcoming  = forecast[forecast["ds"] > today_ts].copy()

    # Respect the deadline if one was provided
    if deadline:
        try:
            deadline_ts = pd.Timestamp(deadline)
            upcoming    = upcoming[upcoming["ds"] <= deadline_ts]
        except Exception:
            pass  # ignore malformed deadline, use full window

    if upcoming.empty:
        raise HTTPException(status_code=400, detail="No forecast dates within window")

    # Highest predicted rate = student's currency is strongest = cheapest day to pay
    best        = upcoming.loc[upcoming["yhat"].idxmin()]
    today_row   = upcoming.iloc[0]
    today_rate  = float(today_row["yhat"])
    optimal_rate = float(best["yhat"])

    # Serialize forecast for the banner's tooltip / future chart use
    forecast_list = [
        {
            "date":  str(row["ds"].date()),
            "rate":  round(float(row["yhat"]), 4),
            "low":   round(float(row["yhat_lower"]), 4),
            "high":  round(float(row["yhat_upper"]), 4),
        }
        for _, row in upcoming.iterrows()
    ]

    return {
        "best_date":       str(best["ds"].date()),
        "predicted_rate":  round(optimal_rate, 4),
        "confidence_low":  round(float(best["yhat_lower"]), 4),
        "confidence_high": round(float(best["yhat_upper"]), 4),
        "today_rate":      round(today_rate, 4),
        "savings_usd":     estimate_savings(amount, today_rate, optimal_rate) if amount else None,
        "currency":        currency,
        "days_ahead":      days_ahead,
        "forecast":        forecast_list,
    }