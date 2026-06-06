"""Generate Open Graph cards (1200x630) from data/axes.yaml.

Output: assets/img/og-uk.png, assets/img/og-en.png

Layout: left half — radar chart (4 axes, 2 actors); right half — title,
weighted totals, gap, as-of date.

Usage:
    py -3.13 scripts/build_og.py            # both languages
    py -3.13 scripts/build_og.py --lang en  # only one
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np
    import yaml
except ImportError as e:
    sys.stderr.write(f"Missing dep: {e.name}. Need: matplotlib, numpy, pyyaml\n")
    sys.exit(2)


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
I18N = ROOT / "assets" / "i18n"
OUT_DIR = ROOT / "assets" / "img"

# Palette — mirrors styles.css.
BG = "#0f1115"
BG_ELEV = "#161a22"
BORDER = "#232936"
TEXT = "#e7ebf2"
TEXT_MUTED = "#9aa3b2"
ACCENT = "#4ea1f3"
ZELENSKY = "#4ea1f3"
PUTIN = "#d9534f"

LABELS = {
    "uk": {
        "title": "Легітимність",
        "subtitle": "Зеленський vs Путін",
        "lede": "4 виміри · симетричні критерії · посилання на джерела",
        "z": "Зеленський",
        "p": "Путін",
        "gap": "розрив",
        "as_of": "Зріз станом на",
        "url": "legitimacy-dash.pages.dev",
    },
    "en": {
        "title": "Legitimacy",
        "subtitle": "Zelensky vs Putin",
        "lede": "4 axes · symmetric criteria · linked primary sources",
        "z": "Zelensky",
        "p": "Putin",
        "gap": "gap",
        "as_of": "As of",
        "url": "legitimacy-dash.pages.dev",
    },
}


def load_axes() -> list[dict[str, Any]]:
    doc = yaml.safe_load((DATA / "axes.yaml").read_text(encoding="utf-8")) or {}
    return doc.get("axes") or []


def load_nav_labels(lang: str) -> dict[str, str]:
    """Read the short nav labels (e.g. 'A. Юр.-електоральна') from i18n."""
    data = json.loads((I18N / f"{lang}.json").read_text(encoding="utf-8"))
    nav = data.get("nav") or {}
    return {
        "A": nav.get("axis_a", "A"),
        "B": nav.get("axis_b", "B"),
        "C": nav.get("axis_c", "C"),
        "D": nav.get("axis_d", "D"),
    }


def weighted_total(axes: list[dict], actor_key: str) -> float:
    return sum((a.get("weight") or 0) * (a.get(actor_key) or 0) for a in axes)


def max_as_of(axes: list[dict]) -> str:
    dates = [a.get("as_of") for a in axes
             if isinstance(a.get("as_of"), str) and len(a["as_of"]) == 10]
    return max(dates) if dates else "—"


def draw_radar(ax_radar, axes: list[dict], lang: str) -> None:
    n = len(axes)
    angles = np.linspace(0, 2 * np.pi, n, endpoint=False)
    angles_closed = np.concatenate([angles, [angles[0]]])
    z_vals = [a.get("score_zelensky") or 0 for a in axes]
    p_vals = [a.get("score_putin") or 0 for a in axes]
    z_closed = z_vals + [z_vals[0]]
    p_closed = p_vals + [p_vals[0]]

    ax_radar.set_facecolor(BG_ELEV)
    ax_radar.set_theta_offset(np.pi / 2)
    ax_radar.set_theta_direction(-1)

    # Grid + axis lines.
    ax_radar.set_rlim(0, 100)
    ax_radar.set_rticks([25, 50, 75, 100])
    ax_radar.set_yticklabels(["25", "50", "75", "100"],
                             color=TEXT_MUTED, fontsize=9)
    ax_radar.set_xticks(angles)
    nav_labels = load_nav_labels(lang)
    short_labels = [nav_labels.get(a["id"], a["id"]) for a in axes]
    ax_radar.set_xticklabels(short_labels, color=TEXT, fontsize=11)
    ax_radar.tick_params(axis="x", pad=10)
    ax_radar.grid(color=BORDER, linewidth=0.8)
    ax_radar.spines["polar"].set_color(BORDER)

    # Putin first (drawn behind), Zelensky on top.
    ax_radar.fill(angles_closed, p_closed, color=PUTIN, alpha=0.22)
    ax_radar.plot(angles_closed, p_closed, color=PUTIN, linewidth=2.2)
    ax_radar.fill(angles_closed, z_closed, color=ZELENSKY, alpha=0.22)
    ax_radar.plot(angles_closed, z_closed, color=ZELENSKY, linewidth=2.2)
    ax_radar.scatter(angles, z_vals, color=ZELENSKY, s=40, zorder=5)
    ax_radar.scatter(angles, p_vals, color=PUTIN, s=40, zorder=5)


def draw_text_panel(fig, axes: list[dict], lang: str) -> None:
    s = LABELS[lang]
    z_total = weighted_total(axes, "score_zelensky")
    p_total = weighted_total(axes, "score_putin")
    gap = z_total - p_total
    as_of = max_as_of(axes)

    # Text panel: x in [0.52, 0.97].
    x0 = 0.52
    # Title.
    fig.text(x0, 0.88, s["title"], color=TEXT, fontsize=46,
             fontweight="bold", ha="left", va="top")
    fig.text(x0, 0.76, s["subtitle"], color=ACCENT, fontsize=24,
             ha="left", va="top")
    fig.text(x0, 0.68, s["lede"], color=TEXT_MUTED, fontsize=13,
             ha="left", va="top")

    # Score block: two columns, label on top, number below.
    col_z_x = x0
    col_p_x = x0 + 0.20
    fig.text(col_z_x, 0.55, s["z"], color=ZELENSKY, fontsize=15,
             fontweight="600", ha="left", va="top")
    fig.text(col_z_x, 0.30, f"{z_total:.0f}", color=ZELENSKY, fontsize=78,
             fontweight="bold", ha="left", va="bottom")
    fig.text(col_p_x, 0.55, s["p"], color=PUTIN, fontsize=15,
             fontweight="600", ha="left", va="top")
    fig.text(col_p_x, 0.30, f"{p_total:.0f}", color=PUTIN, fontsize=78,
             fontweight="bold", ha="left", va="bottom")

    # Gap chip — under the numbers.
    sign = "+" if gap >= 0 else "−"
    fig.text(col_z_x, 0.22, f"{s['gap']}: {sign}{abs(gap):.0f}",
             color=TEXT, fontsize=15, ha="left", va="top",
             bbox=dict(facecolor=BG_ELEV, edgecolor=BORDER,
                       boxstyle="round,pad=0.5"))

    # Footer (as-of + url) at the bottom.
    fig.text(x0, 0.10, f"{s['as_of']}: {as_of}",
             color=TEXT_MUTED, fontsize=12, ha="left", va="bottom",
             fontfamily="monospace")
    fig.text(0.97, 0.10, s["url"], color=ACCENT, fontsize=13,
             ha="right", va="bottom", fontweight="bold")


def render(lang: str, out_path: Path) -> None:
    axes_data = load_axes()
    if not axes_data:
        raise RuntimeError("axes.yaml has no axes")

    fig = plt.figure(figsize=(12, 6.3), dpi=100, facecolor=BG)
    # Radar centered in the left half — leave room for both side labels.
    ax_radar = fig.add_axes([0.10, 0.08, 0.34, 0.84], projection="polar")
    draw_radar(ax_radar, axes_data, lang)
    draw_text_panel(fig, axes_data, lang)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, facecolor=BG, edgecolor="none", dpi=100)
    plt.close(fig)


def main() -> int:
    p = argparse.ArgumentParser(description="Generate OG cards for legitimacy-dash.")
    p.add_argument("--lang", choices=["uk", "en", "all"], default="all")
    p.add_argument("--out-dir", type=Path, default=OUT_DIR)
    args = p.parse_args()

    langs = ["uk", "en"] if args.lang == "all" else [args.lang]
    for lang in langs:
        out = args.out_dir / f"og-{lang}.png"
        render(lang, out)
        size_kb = out.stat().st_size / 1024
        print(f"  {lang} -> {out.relative_to(ROOT)}  ({size_kb:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
