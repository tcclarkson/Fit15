# Ticket price monitor

Tracks resale prices for one show and tells you **BUY NOW**, **BUY SOON / WATCH CLOSELY** or **WAIT**.
It's set up for Harry Styles at AT&T Stadium, Arlington. Nothing here touches the Fit 15 app.

> ⚠️ **Check the date.** News coverage lists the Arlington shows as **April 9 & 10, 2027**. Only one
> reseller page shows April 16. Confirm on your ticket and set `event_date` in `config.json` to match.

## How it works

1. **Automatic prices (SeatGeek API).** A GitHub Action (`.github/workflows/ticket-monitor.yml`) runs every
   6 hours. It records the lowest price, median price and number of listings in `prices.csv`.
   Gametime has no public API, so it can't be checked automatically.
2. **Your Gametime checks.** Log what you see, and it's mixed into the same history:
   `python monitor.py add 285 --section 112`
3. **Recommendation.** `REPORT.md` is rewritten on every run. The advice combines:
   - **How close the show is.** For big two-night stadium runs with lots of resale supply, prices are usually
     highest right after the on-sale and lowest in the final ~10 days. The last 48 hours are the cheapest
     on average but also the riskiest.
   - **Your target and max price** (`target_price`, `max_price` in `config.json`).
   - **The 7- and 21-day price trend.** Rising prices push toward buying; falling prices push toward waiting.
   - **Supply.** More listings usually means falling prices; fewer listings means rising prices.
   - **Price history.** Whether today's price is near the lowest seen so far.
4. **Alerts.** When the advice changes to a BUY signal or your target is hit, the workflow opens a
   GitHub issue. You'll get an email if you watch the repo. You can also get a phone push via
   [ntfy](https://ntfy.sh) if you set `NTFY_TOPIC`.

## Setup

1. Get a free SeatGeek client ID: https://seatgeek.com/account/develop
2. In the GitHub repo, go to **Settings → Secrets and variables → Actions** and add `SEATGEEK_CLIENT_ID`.
   `NTFY_TOPIC` is optional. Install the ntfy app and subscribe to the same topic name.
3. Edit `config.json`: `event_date`, `quantity`, `target_price` and `max_price` (per ticket, all-in).
4. Merge to the default branch, because scheduled workflows only run there. Then go to the
   **Actions** tab → *Ticket price monitor* → **Run workflow** to test it.

If the run log says "No SeatGeek event on …", it lists the events it found. Fix the date, or put the
right ID in `seatgeek.event_id`.

## Run locally

```bash
cd tools/ticket-monitor
SEATGEEK_CLIENT_ID=xxx python monitor.py run   # fetch + recommend
python monitor.py add 299 --source gametime     # log a price you saw
python monitor.py recommend                     # re-read the report
```

Compare like with like. Gametime shows prices with fees included by default, and SeatGeek's
`lowest_price` also includes fees.
This is a rule of thumb, not a guarantee. A surprise announcement such as a new date, a cancellation
or a viral moment can move prices quickly.
