"""Validate data/ files: schemas + URL liveness.

Usage:
    python scripts/validate_data.py            # schemas + HEAD-check лінків
    python scripts/validate_data.py --no-links # тільки схеми
    python scripts/validate_data.py --strict   # exit 1 on warnings too

Deps: pyyaml, requests (опціонально для --no-links).
"""
from __future__ import annotations

import argparse
import csv
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    sys.stderr.write("Install pyyaml: pip install pyyaml\n")
    sys.exit(2)


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

ALLOWED_ACTOR = {"zelensky", "putin"}
ALLOWED_AXIS = {"A", "B", "C", "D"}
ALLOWED_EVENT_TYPE = {
    "election", "warrant", "sanction", "resolution",
    "territorial", "repression", "communique", "decision", "other",
}
ALLOWED_IMPACT = {"positive", "negative", "neutral",
                  "negative_to_target", "supportive_to_actor"}
ALLOWED_DOC_ISSUER = {"ICC", "UN_GA", "UN_SC", "ECHR", "ICJ", "CoE", "EU", "G7"}
ALLOWED_DOC_TYPE = {"warrant", "resolution", "judgment", "decision", "communique"}
ALLOWED_POLLSTER_TYPE = {"independent", "state"}
ALLOWED_COUNTRY = {"UA", "RU"}
ALLOWED_INDEX = {
    "vdem_liberal", "vdem_electoral",
    "fh_global", "fh_political_rights", "fh_civil_liberties",
    "rsf_press_freedom",
}
ALLOWED_TERRITORY_SOURCE = {"ISW", "DeepStateMAP", "BlackBirdGroup"}


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, where: str, msg: str) -> None:
        self.errors.append(f"[ERROR] {where}: {msg}")

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append(f"[WARN]  {where}: {msg}")

    def print(self) -> None:
        for line in self.errors + self.warnings:
            print(line)

    def ok(self, strict: bool) -> bool:
        if self.errors:
            return False
        if strict and self.warnings:
            return False
        return True


def _is_iso_date(value: Any) -> bool:
    if isinstance(value, date):
        return True
    if not isinstance(value, str):
        return False
    parts = value.split("-")
    if len(parts) not in (2, 3):
        return False
    try:
        [int(p) for p in parts]
    except ValueError:
        return False
    return True


def _require(d: dict, key: str, where: str, rep: Report) -> Any:
    if key not in d or d[key] is None or d[key] == "":
        rep.error(where, f"missing required field '{key}'")
        return None
    return d[key]


def validate_axes(rep: Report, event_ids: set[str] | None = None) -> list[str]:
    path = DATA / "axes.yaml"
    if not path.exists():
        rep.error("axes.yaml", "file not found")
        return []
    doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    urls: list[str] = []
    axes = doc.get("axes") or []
    if not axes:
        rep.warn("axes.yaml", "no axes defined (placeholder)")
    seen_ids = set()
    total_weight = 0.0
    for i, ax in enumerate(axes):
        where = f"axes.yaml::axes[{i}]"
        ax_id = _require(ax, "id", where, rep)
        if ax_id in seen_ids:
            rep.error(where, f"duplicate axis id '{ax_id}'")
        seen_ids.add(ax_id)
        if ax_id and ax_id not in ALLOWED_AXIS:
            rep.error(where, f"unknown axis id '{ax_id}' (allowed: {sorted(ALLOWED_AXIS)})")
        _require(ax, "title_uk", where, rep)
        _require(ax, "title_en", where, rep)
        w = ax.get("weight")
        if not isinstance(w, (int, float)):
            rep.error(where, "weight must be a number")
        else:
            total_weight += w
        comp_weight_sum = 0.0
        for j, c in enumerate(ax.get("components") or []):
            cwhere = f"{where}.components[{j}]"
            _require(c, "id", cwhere, rep)
            _require(c, "title_uk", cwhere, rep)
            _require(c, "title_en", cwhere, rep)
            cw = c.get("weight")
            if not isinstance(cw, (int, float)):
                rep.error(cwhere, "component weight must be a number")
            else:
                comp_weight_sum += cw
            for actor in ("zelensky", "putin"):
                v = c.get(f"point_{actor}")
                if v is None:
                    continue
                if not isinstance(v, (int, float)) or not (0 <= v <= 100):
                    rep.error(cwhere, f"point_{actor}={v!r} must be number in [0,100]")
            if event_ids is not None:
                for eid in c.get("evidence_ids") or []:
                    if eid not in event_ids:
                        rep.error(cwhere,
                                  f"evidence_ids: '{eid}' not found in events.yaml")
        if (ax.get("components") or []) and abs(comp_weight_sum - 1.0) > 0.001:
            rep.warn(where, f"component weights sum to {comp_weight_sum:.3f}, expected 1.000")
        for s in ax.get("sources") or []:
            if isinstance(s, dict) and s.get("url"):
                urls.append(s["url"])
            elif isinstance(s, str):
                urls.append(s)
    if axes and abs(total_weight - 1.0) > 0.001:
        rep.warn("axes.yaml", f"axes weights sum to {total_weight:.3f}, expected 1.000")
    return urls


def validate_events(rep: Report) -> tuple[list[str], set[str]]:
    path = DATA / "events.yaml"
    if not path.exists():
        rep.error("events.yaml", "file not found")
        return [], set()
    doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    urls: list[str] = []
    seen_ids: set[str] = set()
    for i, ev in enumerate(doc.get("events") or []):
        where = f"events.yaml::events[{i}]"
        ev_id = _require(ev, "id", where, rep)
        if ev_id and ev_id in seen_ids:
            rep.error(where, f"duplicate event id '{ev_id}'")
        if ev_id:
            seen_ids.add(ev_id)
        d = _require(ev, "date", where, rep)
        if d and not _is_iso_date(d):
            rep.error(where, f"date '{d}' is not ISO YYYY-MM[-DD]")
        actor = _require(ev, "actor", where, rep)
        if actor and actor not in ALLOWED_ACTOR:
            rep.error(where, f"actor '{actor}' not in {sorted(ALLOWED_ACTOR)}")
        axis = _require(ev, "axis", where, rep)
        if axis and axis not in ALLOWED_AXIS:
            rep.error(where, f"axis '{axis}' not in {sorted(ALLOWED_AXIS)}")
        tp = _require(ev, "type", where, rep)
        if tp and tp not in ALLOWED_EVENT_TYPE:
            rep.error(where, f"type '{tp}' not in {sorted(ALLOWED_EVENT_TYPE)}")
        _require(ev, "title_uk", where, rep)
        _require(ev, "title_en", where, rep)
        url = _require(ev, "source_url", where, rep)
        if url:
            urls.append(url)
        impact = ev.get("impact")
        if impact and impact not in ALLOWED_IMPACT:
            rep.error(where, f"impact '{impact}' not in {sorted(ALLOWED_IMPACT)}")
    return urls, seen_ids


def validate_docs(rep: Report) -> list[str]:
    path = DATA / "icc_un_docs.yaml"
    if not path.exists():
        rep.error("icc_un_docs.yaml", "file not found")
        return []
    doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    urls: list[str] = []
    seen_ids = set()
    for i, d in enumerate(doc.get("documents") or []):
        where = f"icc_un_docs.yaml::documents[{i}]"
        did = _require(d, "id", where, rep)
        if did and did in seen_ids:
            rep.error(where, f"duplicate doc id '{did}'")
        if did:
            seen_ids.add(did)
        issuer = _require(d, "issuer", where, rep)
        if issuer and issuer not in ALLOWED_DOC_ISSUER:
            rep.error(where, f"issuer '{issuer}' not in {sorted(ALLOWED_DOC_ISSUER)}")
        dt = _require(d, "doc_type", where, rep)
        if dt and dt not in ALLOWED_DOC_TYPE:
            rep.error(where, f"doc_type '{dt}' not in {sorted(ALLOWED_DOC_TYPE)}")
        dd = _require(d, "date", where, rep)
        if dd and not _is_iso_date(dd):
            rep.error(where, f"date '{dd}' is not ISO YYYY-MM[-DD]")
        actor = d.get("target_actor")
        if actor and actor not in ALLOWED_ACTOR:
            rep.error(where, f"target_actor '{actor}' not in {sorted(ALLOWED_ACTOR)} or null")
        _require(d, "title_uk", where, rep)
        _require(d, "title_en", where, rep)
        url = _require(d, "source_url", where, rep)
        if url:
            urls.append(url)
    return urls


def _read_csv(path: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    with path.open(encoding="utf-8") as f:
        reader = csv.DictReader(
            (line for line in f if not line.lstrip().startswith("#"))
        )
        for row in reader:
            # Skip pure-blank lines
            if not any((v or "").strip() for v in row.values()):
                continue
            rows.append(row)
    return rows


def validate_polls(rep: Report, fname: str, expect_country: str) -> list[str]:
    path = DATA / fname
    if not path.exists():
        rep.error(fname, "file not found")
        return []
    urls: list[str] = []
    for i, row in enumerate(_read_csv(path)):
        where = f"{fname}::row[{i}]"
        d = row.get("date") or ""
        if not _is_iso_date(d):
            rep.error(where, f"date '{d}' is not ISO YYYY-MM[-DD]")
        if not row.get("pollster"):
            rep.error(where, "missing pollster")
        ptype = row.get("pollster_type") or ""
        if ptype and ptype not in ALLOWED_POLLSTER_TYPE:
            rep.error(where, f"pollster_type '{ptype}' not in {sorted(ALLOWED_POLLSTER_TYPE)}")
        try:
            t = float(row.get("trust_pct") or "")
            if not (0 <= t <= 100):
                rep.error(where, f"trust_pct {t} out of [0,100]")
        except ValueError:
            rep.error(where, "trust_pct must be a number")
        url = row.get("source_url") or ""
        if not url:
            rep.error(where, "missing source_url")
        else:
            urls.append(url)
    _ = expect_country  # reserved for future cross-checks
    return urls


def validate_indices(rep: Report) -> list[str]:
    path = DATA / "indices.csv"
    if not path.exists():
        rep.error("indices.csv", "file not found")
        return []
    urls: list[str] = []
    for i, row in enumerate(_read_csv(path)):
        where = f"indices.csv::row[{i}]"
        y = row.get("year") or ""
        if not (y.isdigit() and 1990 <= int(y) <= 2100):
            rep.error(where, f"year '{y}' invalid")
        c = row.get("country") or ""
        if c not in ALLOWED_COUNTRY:
            rep.error(where, f"country '{c}' not in {sorted(ALLOWED_COUNTRY)}")
        idx = row.get("index") or ""
        if idx not in ALLOWED_INDEX:
            rep.error(where, f"index '{idx}' not in {sorted(ALLOWED_INDEX)}")
        try:
            float(row.get("value") or "")
        except ValueError:
            rep.error(where, "value must be a number")
        url = row.get("source_url") or ""
        if not url:
            rep.error(where, "missing source_url")
        else:
            urls.append(url)
    return urls


def validate_territory(rep: Report) -> list[str]:
    path = DATA / "territory_control.csv"
    if not path.exists():
        rep.warn("territory_control.csv", "file not found (optional)")
        return []
    urls: list[str] = []
    seen_pairs: set[tuple[str, str]] = set()
    for i, row in enumerate(_read_csv(path)):
        where = f"territory_control.csv::row[{i}]"
        q = row.get("quarter") or ""
        if not q or not q.split("-")[0].isdigit() or "-Q" not in q:
            rep.error(where, f"quarter '{q}' must be 'YYYY-Q[1-4]'")
        src = row.get("source") or ""
        if src and src not in ALLOWED_TERRITORY_SOURCE:
            rep.error(where,
                      f"source '{src}' not in {sorted(ALLOWED_TERRITORY_SOURCE)}")
        if q and src:
            key = (q, src)
            if key in seen_pairs:
                rep.error(where, f"duplicate (quarter, source): {key}")
            seen_pairs.add(key)
        d = row.get("date_end") or ""
        if not _is_iso_date(d):
            rep.error(where, f"date_end '{d}' is not ISO YYYY-MM-DD")
        try:
            v = float(row.get("ua_control_pct") or "")
            if not (0 <= v <= 100):
                rep.error(where, f"ua_control_pct {v} out of [0,100]")
        except ValueError:
            rep.error(where, "ua_control_pct must be a number")
        if not src:
            rep.error(where, "missing source")
        url = row.get("source_url") or ""
        if not url:
            rep.error(where, "missing source_url")
        else:
            urls.append(url)
    return urls


def check_urls(urls: list[str], rep: Report) -> None:
    try:
        import requests
    except ImportError:
        rep.warn("link-check", "requests not installed — skipping URL liveness check")
        return
    unique = sorted({u for u in urls if u})
    if not unique:
        return
    print(f"\nChecking {len(unique)} unique URL(s)...")
    # Many gov/intl sites block default user agents. Pretend to be a real browser.
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    # Anti-bot status codes treated as INFO (URL probably works in a real browser).
    SOFT_PASS = {401, 403, 405}

    def _check(url: str) -> tuple[str, int | str]:
        try:
            r = requests.get(url, headers=headers, stream=True,
                             allow_redirects=True, timeout=15)
            return url, r.status_code
        except Exception as e:  # noqa: BLE001
            return url, f"ERR: {type(e).__name__}: {e}"

    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = [pool.submit(_check, u) for u in unique]
        for f in as_completed(futs):
            url, status = f.result()
            if isinstance(status, int) and 200 <= status < 400:
                print(f"  OK   {status} {url}")
            elif isinstance(status, int) and status in SOFT_PASS:
                print(f"  GATED {status} {url} (likely OK in browser)")
            else:
                rep.warn("link-check", f"{status} {url}")


def main() -> int:
    p = argparse.ArgumentParser(description="Validate legitimacy-dash data files.")
    p.add_argument("--no-links", action="store_true", help="skip URL liveness check")
    p.add_argument("--strict", action="store_true", help="exit 1 on warnings too")
    args = p.parse_args()

    rep = Report()
    urls: list[str] = []
    event_urls, event_ids = validate_events(rep)
    urls += event_urls
    urls += validate_axes(rep, event_ids=event_ids)
    urls += validate_docs(rep)
    urls += validate_polls(rep, "polls_ua.csv", "UA")
    urls += validate_polls(rep, "polls_ru.csv", "RU")
    urls += validate_indices(rep)
    urls += validate_territory(rep)

    if not args.no_links:
        check_urls(urls, rep)

    rep.print()
    print(f"\nErrors: {len(rep.errors)}  Warnings: {len(rep.warnings)}")
    return 0 if rep.ok(args.strict) else 1


if __name__ == "__main__":
    sys.exit(main())
