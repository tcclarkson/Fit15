#!/usr/bin/env python3
"""Resale ticket price monitor + buy/wait recommender.

Standard library only. Commands:

  python monitor.py fetch                 # pull current SeatGeek stats, append to prices.csv
  python monitor.py add 312 [--source gametime] [--section 120] [--listings 900]
                                          # log a price you saw yourself (e.g. on Gametime)
  python monitor.py recommend             # analyse history, print + write REPORT.md
  python monitor.py run                   # fetch, then recommend

Prices are per ticket, all-in (fees included) wherever the source allows.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
import statistics
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG_PATH = HERE / "config.json"
PRICES_PATH = HERE / "prices.csv"
REPORT_PATH = HERE / "REPORT.md"
STATE_PATH = HERE / "state.json"

FIELDS = ["timestamp", "source", "lowest_price", "median_price", "average_price", "listing_count", "section", "note"]


# --------------------------------------------------------------------------- data

@dataclass
class Point:
    ts: datetime
    source: str
    lowest: float
    median: float | None
    listings: int | None

    @property
    def day(self) -> date:
        return self.ts.date()


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text())


def _num(v: str | None, cast=float):
    try:
        return cast(v) if v not in (None, "") else None
    except ValueError:
        return None


def load_points() -> list[Point]:
    if not PRICES_PATH.exists():
        return []
    pts = []
    with PRICES_PATH.open() as f:
        for row in csv.DictReader(f):
            lowest = _num(row.get("lowest_price"))
            if lowest is None:
                continue
            ts = datetime.fromisoformat(row["timestamp"])
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            pts.append(Point(ts, row.get("source") or "?", lowest,
                             _num(row.get("median_price")), _num(row.get("listing_count"), int)))
    return sorted(pts, key=lambda p: p.ts)


def append_row(row: dict) -> None:
    new = not PRICES_PATH.exists()
    with PRICES_PATH.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        if new:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in FIELDS})


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


# --------------------------------------------------------------------------- sources

def fetch_seatgeek(cfg: dict) -> dict:
    client_id = os.environ.get("SEATGEEK_CLIENT_ID")
    if not client_id:
        raise SystemExit("SEATGEEK_CLIENT_ID is not set (free key: https://seatgeek.com/account/develop)")
    sg = cfg.get("seatgeek", {})
    params = {"client_id": client_id, "per_page": 25}
    if sg.get("event_id"):
        url = f"https://api.seatgeek.com/2/events/{sg['event_id']}?" + urllib.parse.urlencode(params)
    else:
        params.update({"q": sg.get("query", ""), "venue.city": sg.get("city", "")})
        url = "https://api.seatgeek.com/2/events?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "ticket-monitor/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)

    events = [data] if sg.get("event_id") else data.get("events", [])
    target = cfg["event_date"]
    match = next((e for e in events if str(e.get("datetime_local", "")).startswith(target)), None)
    if match is None:
        found = ", ".join(f"{e.get('datetime_local', '?')[:10]} (id {e.get('id')})" for e in events) or "none"
        raise SystemExit(f"No SeatGeek event on {target}. Events found: {found}. "
                         "Fix event_date or set seatgeek.event_id in config.json.")
    s = match.get("stats") or {}
    if s.get("lowest_price") is None:
        raise SystemExit("SeatGeek returned no price stats for this event yet.")
    return {
        "timestamp": now_iso(), "source": "seatgeek",
        "lowest_price": s.get("lowest_price"), "median_price": s.get("median_price"),
        "average_price": s.get("average_price"),
        "listing_count": s.get("visible_listing_count") or s.get("listing_count"),
        "note": match.get("url", ""),
    }


# --------------------------------------------------------------------------- analysis

def daily_lows(points: list[Point]) -> list[tuple[date, float]]:
    """Cheapest price seen per day across all sources."""
    by_day: dict[date, float] = {}
    for p in points:
        by_day[p.day] = min(by_day.get(p.day, math.inf), p.lowest)
    return sorted(by_day.items())


def slope_pct_per_day(series: list[tuple[date, float]]) -> float | None:
    """Least-squares slope of log(price), as % change per day."""
    if len(series) < 3:
        return None
    xs = [(d - series[0][0]).days for d, _ in series]
    ys = [math.log(v) for _, v in series]
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    den = sum((x - mx) ** 2 for x in xs)
    if den == 0:
        return None
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den
    return (math.exp(b) - 1) * 100


def window(series, end: date, days: int):
    return [(d, v) for d, v in series if 0 <= (end - d).days < days]


def listing_trend(points: list[Point], days: int = 7) -> float | None:
    """% change in listing count over the last `days` (supply signal)."""
    pts = [p for p in points if p.listings]
    if len(pts) < 2:
        return None
    last = pts[-1]
    older = [p for p in pts if (last.ts - p.ts).days >= days] or pts[:1]
    base = older[-1].listings
    if not base or older[-1] is last:
        return None
    return (last.listings - base) / base * 100


def phase_for(days_out: int) -> tuple[str, int, str]:
    """Typical resale behaviour by time-to-show for a big multi-night stadium run.

    Returns (label, timing score, explanation). Positive score favours buying.
    """
    if days_out < 0:
        return "after the show", 0, "The show date has passed."
    if days_out <= 2:
        return "final 48 hours", 2, ("Sellers who can't go cut prices hard, but inventory can vanish and "
                                     "prices can spike if it's close to sold out. High risk, high reward.")
    if days_out <= 10:
        return "final stretch", 2, ("Historically the most common window for the lowest prices on a big "
                                    "stadium show with lots of resale supply. A good time to buy.")
    if days_out <= 30:
        return "approaching", 0, ("Prices often stay flat or drift down. Get ready to buy when your target hits.")
    if days_out <= 90:
        return "mid-cycle", -1, ("Usually a slow drift. There's rarely a reason to rush unless prices "
                                 "are clearly climbing or you hit your target.")
    return "early", -2, ("Soon after the on-sale, prices tend to be high while speculators test the "
                         "market. Waiting usually pays off unless the price is already very good.")


def analyse(cfg: dict, points: list[Point], today: date | None = None) -> dict:
    today = today or datetime.now(timezone.utc).date()
    event_day = date.fromisoformat(cfg["event_date"])
    days_out = (event_day - today).days
    phase, score, phase_note = phase_for(days_out)
    reasons = [f"Timing ({phase}, {days_out} days out): {phase_note}"]

    series = daily_lows(points)
    target = cfg.get("target_price")
    max_price = cfg.get("max_price")
    result = {"days_out": days_out, "phase": phase, "series": series, "target": target, "max_price": max_price}

    if not series:
        result.update(signal="NO DATA", score=score, reasons=reasons + ["No prices logged yet."])
        return result

    current = points[-1].lowest
    recent = [p.lowest for p in points if (points[-1].ts - p.ts).days < 1]
    current = min(recent) if recent else current
    all_low = min(v for _, v in series)
    s7 = slope_pct_per_day(window(series, series[-1][0], 7))
    s21 = slope_pct_per_day(window(series, series[-1][0], 21))
    lt = listing_trend(points)
    vals30 = [v for _, v in window(series, series[-1][0], 30)]
    vol = statistics.pstdev(vals30) / statistics.fmean(vals30) * 100 if len(vals30) >= 3 else None

    # Price vs your numbers
    if target and current <= target:
        score += 3
        reasons.append(f"Current low ${current:,.0f} is at or below your target of ${target:,.0f}.")
    elif max_price and current > max_price:
        score -= 2
        reasons.append(f"Current low ${current:,.0f} is above your max of ${max_price:,.0f}.")

    # Price vs history
    if len(series) >= 3:
        if current <= all_low * 1.03:
            score += 1
            reasons.append(f"Within 3% of the lowest price tracked so far (${all_low:,.0f}).")
        elif current >= all_low * 1.20:
            score -= 1
            reasons.append(f"{(current / all_low - 1) * 100:.0f}% above the lowest price tracked (${all_low:,.0f}).")

    # Momentum
    trend = s7 if s7 is not None else s21
    if trend is not None:
        if trend <= -1.0:
            score -= 1
            reasons.append(f"Prices are falling about {abs(trend):.1f}% a day. Waiting should get you a better price.")
        elif trend >= 1.0:
            score += 1
            reasons.append(f"Prices are rising about {trend:.1f}% a day. Waiting could cost you.")
        else:
            reasons.append(f"Prices are roughly flat ({trend:+.1f}% a day).")
    else:
        reasons.append("Not enough history yet to read a trend (need about 3 days of data).")

    # Supply
    if lt is not None:
        if lt <= -15:
            score += 1
            reasons.append(f"Listings are down {abs(lt):.0f}% this week. Supply is tightening, which usually pushes prices up.")
        elif lt >= 15:
            score -= 1
            reasons.append(f"Listings are up {lt:.0f}% this week. More supply usually brings prices down.")

    if days_out <= 2 and days_out >= 0:
        score += 2  # little time left to wait
    if score >= 3:
        signal = "BUY NOW"
    elif score >= 1:
        signal = "BUY SOON / WATCH CLOSELY"
    else:
        signal = "WAIT"

    # Suggested price to buy at: the lower of the target and a dip below the recent typical price
    recent_med = statistics.median(vals30) if vals30 else current
    buy_below = min(x for x in [target, recent_med * 0.92] if x) if target else recent_med * 0.92

    result.update(signal=signal, score=score, reasons=reasons, current=current, all_low=all_low,
                  slope7=s7, slope21=s21, listing_trend=lt, volatility=vol, buy_below=buy_below,
                  last_ts=points[-1].ts)
    return result


# --------------------------------------------------------------------------- output

def sparkline(vals: list[float]) -> str:
    if not vals:
        return ""
    bars = "▁▂▃▄▅▆▇█"
    lo, hi = min(vals), max(vals)
    if hi == lo:
        return bars[3] * len(vals)
    return "".join(bars[int((v - lo) / (hi - lo) * (len(bars) - 1))] for v in vals)


def render_report(cfg: dict, a: dict) -> str:
    fmt = lambda v: "n/a" if v is None else f"${v:,.0f}"
    pct = lambda v: "n/a" if v is None else f"{v:+.1f}%"
    lines = [
        f"# Ticket monitor: {cfg['event_name']}",
        "",
        f"**{cfg['venue']} · {cfg['event_date']} · {cfg.get('quantity', 1)} tickets**",
        "",
        f"## Recommendation: **{a['signal']}**",
        "",
    ]
    if a["signal"] != "NO DATA":
        lines += [
            "| | |", "|---|---|",
            f"| Current lowest (per ticket) | {fmt(a['current'])} |",
            f"| Lowest tracked so far | {fmt(a['all_low'])} |",
            f"| Your target / max | {fmt(a['target'])} / {fmt(a['max_price'])} |",
            f"| Suggested buy-below price | {fmt(a['buy_below'])} |",
            f"| 7-day trend (per day) | {pct(a['slope7'])} |",
            f"| 21-day trend (per day) | {pct(a['slope21'])} |",
            f"| Listings change (7 days) | {pct(a['listing_trend'])} |",
            f"| Days until show | {a['days_out']} ({a['phase']}) |",
            f"| Last updated | {a['last_ts']:%Y-%m-%d %H:%M} UTC |",
            "",
            f"Last {min(len(a['series']), 30)} days (daily low): `{sparkline([v for _, v in a['series'][-30:]])}`",
            "",
        ]
    lines += ["## Why", ""] + [f"- {r}" for r in a["reasons"]]
    lines += ["", "_This is a rule-of-thumb read on resale trends, not a guarantee. "
              "Prices can move fast, especially in the last few days._", ""]
    return "\n".join(lines)


def notify(cfg: dict, a: dict) -> None:
    """Record the signal; print a NOTIFY line on actionable changes (the workflow turns it into an alert)."""
    prev = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {}
    hit_target = a.get("current") is not None and a.get("target") and a["current"] <= a["target"]
    # Only ping on news worth acting on: a newly-hit target or a move into a buy signal.
    became_buy = a["signal"].startswith("BUY") and prev.get("signal") != a["signal"]
    changed = became_buy or (hit_target and not prev.get("hit_target"))
    STATE_PATH.write_text(json.dumps({"signal": a["signal"], "hit_target": bool(hit_target),
                                      "current": a.get("current")}, indent=2) + "\n")
    if changed:
        msg = f"{a['signal']}: lowest ${a['current']:,.0f}/ticket, {a['days_out']} days out"
        print(f"NOTIFY: {msg}")
        out = os.environ.get("GITHUB_OUTPUT")
        if out:
            with open(out, "a") as f:
                f.write(f"notify=true\nmessage={msg}\n")


# --------------------------------------------------------------------------- cli

def cmd_fetch(cfg, _args):
    row = fetch_seatgeek(cfg)
    append_row(row)
    print(f"Logged SeatGeek: lowest ${row['lowest_price']}, {row['listing_count']} listings")


def cmd_add(_cfg, args):
    append_row({"timestamp": now_iso(), "source": args.source, "lowest_price": args.price,
                "listing_count": args.listings or "", "section": args.section or "", "note": args.note or ""})
    print(f"Logged {args.source}: ${args.price:,.0f}")


def cmd_recommend(cfg, _args):
    a = analyse(cfg, load_points())
    report = render_report(cfg, a)
    REPORT_PATH.write_text(report)
    print(report)
    notify(cfg, a)


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("fetch")
    a = sub.add_parser("add")
    a.add_argument("price", type=float, help="lowest all-in price per ticket you saw")
    a.add_argument("--source", default="gametime")
    a.add_argument("--section")
    a.add_argument("--listings", type=int)
    a.add_argument("--note")
    sub.add_parser("recommend")
    sub.add_parser("run")
    args = p.parse_args(argv)
    cfg = load_config()
    if args.cmd == "run":
        try:
            cmd_fetch(cfg, args)
        except (SystemExit, OSError) as e:  # still produce a report from existing data
            print(f"Fetch skipped: {e}", file=sys.stderr)
        cmd_recommend(cfg, args)
    else:
        {"fetch": cmd_fetch, "add": cmd_add, "recommend": cmd_recommend}[args.cmd](cfg, args)


if __name__ == "__main__":
    main()
