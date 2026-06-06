"""Build legitimacy-dash for deploy: render YAML/CSV to JSON, copy static assets.

Output: dist/  (deployable as a Cloudflare Pages site)
    dist/
      index.html
      assets/...
      data/axes.json, events.json, country_status.json, icc_un_docs.json,
           polls_ua.json, polls_ru.json, indices.json, world.geojson

CSV → JSON keeps each row as an object; numeric fields parsed where the
validator already enforces a numeric type.

Usage:
    python scripts/build.py            # full build
    python scripts/build.py --clean    # rm dist/ first
    python scripts/build.py --no-html  # skip copying index.html / assets

Deps: pyyaml (same as validate_data.py).
"""
from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    sys.stderr.write("Install pyyaml: pip install pyyaml\n")
    sys.exit(2)


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DIST = ROOT / "dist"

SITE_URL = "https://legitimacy-dash.pages.dev"


# Which CSV columns should be parsed as float; everything else stays string.
POLLS_NUMERIC = {"trust_pct", "margin_error_pct"}
INDICES_NUMERIC = {"value"}
INDICES_INT = {"year"}
TERRITORY_NUMERIC = {"ua_control_pct"}
HISTORY_NUMERIC = {"axis_a", "axis_b", "axis_c", "axis_d", "total"}


def _json_default(o: Any) -> str:
    if isinstance(o, (date, datetime)):
        return o.isoformat()
    raise TypeError(f"not JSON-serialisable: {type(o).__name__}")


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(obj, ensure_ascii=False, indent=2, default=_json_default) + "\n",
        encoding="utf-8",
    )


def yaml_to_json(name: str, out: Path) -> None:
    src = DATA / name
    doc = yaml.safe_load(src.read_text(encoding="utf-8")) or {}
    write_json(out / (Path(name).stem + ".json"), doc)


def csv_to_json(
    name: str,
    out: Path,
    *,
    numeric: set[str] = frozenset(),
    integer: set[str] = frozenset(),
) -> None:
    src = DATA / name
    rows: list[dict[str, Any]] = []
    with src.open(encoding="utf-8") as f:
        reader = csv.DictReader(
            line for line in f if not line.lstrip().startswith("#")
        )
        for raw in reader:
            if not any((v or "").strip() for v in raw.values()):
                continue
            row: dict[str, Any] = {}
            for k, v in raw.items():
                if v is None or v == "":
                    row[k] = None
                    continue
                v = v.strip()
                if k in integer:
                    try:
                        row[k] = int(v)
                        continue
                    except ValueError:
                        pass
                if k in numeric:
                    try:
                        row[k] = float(v)
                        continue
                    except ValueError:
                        pass
                row[k] = v
            rows.append(row)
    write_json(out / (Path(name).stem + ".json"), {"rows": rows})


def copy_static(no_html: bool) -> None:
    if not no_html:
        shutil.copy2(ROOT / "index.html", DIST / "index.html")
    assets_src = ROOT / "assets"
    assets_dst = DIST / "assets"
    if assets_dst.exists():
        shutil.rmtree(assets_dst)
    shutil.copytree(assets_src, assets_dst)
    # GeoJSON стейзиться як-є — це вже валідний JSON, парсити нема сенсу.
    shutil.copy2(DATA / "world.geojson", DIST / "data" / "world.geojson")
    robots = ROOT / "robots.txt"
    if robots.exists():
        shutil.copy2(robots, DIST / "robots.txt")
    not_found = ROOT / "404.html"
    if not_found.exists():
        shutil.copy2(not_found, DIST / "404.html")


def latest_axes_date() -> str:
    """Return max as_of from data/axes.yaml (YYYY-MM-DD) or today's date."""
    doc = yaml.safe_load((DATA / "axes.yaml").read_text(encoding="utf-8")) or {}
    dates = []
    for ax in doc.get("axes") or []:
        d = ax.get("as_of")
        if isinstance(d, str) and len(d) == 10:
            dates.append(d)
        elif isinstance(d, date):
            dates.append(d.isoformat())
    return max(dates) if dates else date.today().isoformat()


def write_sitemap() -> None:
    lastmod = latest_axes_date()
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>{SITE_URL}/</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="uk" href="{SITE_URL}/?lang=uk"/>
    <xhtml:link rel="alternate" hreflang="en" href="{SITE_URL}/?lang=en"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="{SITE_URL}/"/>
  </url>
</urlset>
"""
    (DIST / "sitemap.xml").write_text(xml, encoding="utf-8")


def write_manifest() -> None:
    """Невеликий маніфест з датою збірки — корисно для перевірки кешу."""
    write_json(
        DIST / "data" / "build.json",
        {
            "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "version": 1,
        },
    )


def regen_og() -> None:
    """Re-run scripts/build_og.py to refresh OG cards before copying assets."""
    import subprocess
    script = ROOT / "scripts" / "build_og.py"
    if not script.exists():
        print("  build_og.py missing, skipping OG regen")
        return
    print("OG cards")
    res = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
    if res.returncode != 0:
        print(res.stdout)
        print(res.stderr, file=sys.stderr)
        raise RuntimeError(f"build_og.py exited {res.returncode}")
    for line in res.stdout.splitlines():
        print(line)


def main() -> int:
    p = argparse.ArgumentParser(description="Build legitimacy-dash to dist/")
    p.add_argument("--clean", action="store_true", help="remove dist/ before build")
    p.add_argument("--no-html", action="store_true", help="skip index.html / assets copy")
    p.add_argument("--og", action="store_true",
                   help="regenerate OG cards (assets/img/og-*.png) before copying")
    args = p.parse_args()

    if args.clean and DIST.exists():
        print(f"Cleaning {DIST}")
        shutil.rmtree(DIST)

    out_data = DIST / "data"
    out_data.mkdir(parents=True, exist_ok=True)

    print("YAML -> JSON")
    for name in ("axes.yaml", "events.yaml",
                 "icc_un_docs.yaml", "country_status.yaml"):
        yaml_to_json(name, out_data)
        print(f"  {name} -> {Path(name).stem}.json")

    print("CSV -> JSON")
    csv_to_json("polls_ua.csv", out_data, numeric=POLLS_NUMERIC)
    csv_to_json("polls_ru.csv", out_data, numeric=POLLS_NUMERIC)
    csv_to_json("indices.csv", out_data, numeric=INDICES_NUMERIC, integer=INDICES_INT)
    extra_names: list[str] = []
    if (DATA / "territory_control.csv").exists():
        csv_to_json("territory_control.csv", out_data, numeric=TERRITORY_NUMERIC)
        extra_names.append("territory_control")
    if (DATA / "legitimacy_history.csv").exists():
        csv_to_json("legitimacy_history.csv", out_data, numeric=HISTORY_NUMERIC)
        extra_names.append("legitimacy_history")
    for n in ("polls_ua", "polls_ru", "indices", *extra_names):
        print(f"  {n}.csv -> {n}.json")

    if args.og:
        regen_og()

    print("Static")
    copy_static(args.no_html)
    print(f"  assets/ -> {DIST / 'assets'}")
    print(f"  world.geojson -> {DIST / 'data' / 'world.geojson'}")
    if (ROOT / "robots.txt").exists():
        print(f"  robots.txt -> {DIST / 'robots.txt'}")
    if (ROOT / "404.html").exists():
        print(f"  404.html -> {DIST / '404.html'}")
    if not args.no_html:
        print(f"  index.html -> {DIST / 'index.html'}")

    write_sitemap()
    print(f"  sitemap.xml -> {DIST / 'sitemap.xml'} (lastmod {latest_axes_date()})")

    write_manifest()
    print(f"\nBuilt -> {DIST}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
