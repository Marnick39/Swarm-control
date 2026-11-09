#!/usr/bin/env python3
"""Headless render + JS-error check for index.html. Runs inside the pwshot
container. Captures console errors and writes a few screenshots across states."""
import sys
from playwright.sync_api import sync_playwright

URL = "file:///work/sim-ng/index.html"
OUT = "/work/sim-ng/_shots"
import os; os.makedirs(OUT, exist_ok=True)

shots = [
    # name, budget_index, oversight, tick, theme
    ("a_default_t60", 3, True, 60, "dark"),
    ("b_no_oversight_t92", 0, False, 92, "dark"),
    ("c_budget2_t92", 3, True, 92, "dark"),
    ("d_budget20_t92", 6, True, 92, "dark"),
    ("e_light_t70", 3, True, 70, "light"),
]

errors = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    pg = b.new_page(viewport={"width":1560,"height":1000}, device_scale_factor=2)
    pg.on("console", lambda m: errors.append((m.type, m.text)) if m.type in ("error","warning") else None)
    pg.on("pageerror", lambda e: errors.append(("pageerror", str(e))))
    pg.goto(URL, wait_until="load")
    pg.wait_for_function("window.__sim && window.__sim.ready === true", timeout=8000)
    pg.evaluate("window.__sim.pause()")
    for name, bi, ov, tick, theme in shots:
        pg.evaluate("t => document.documentElement.setAttribute('data-theme', t)", theme)
        pg.evaluate("ov => window.__sim.setOversight(ov)", ov)
        pg.evaluate("bi => window.__sim.setBudget(bi)", bi)
        pg.evaluate("tk => window.__sim.seek(tk)", tick)
        pg.wait_for_timeout(250)
        pg.screenshot(path=f"{OUT}/{name}.png")
    # full-page shots so the timeline scrubber + act-stream feed are visible
    pg.evaluate("t => document.documentElement.setAttribute('data-theme', t)", "dark")
    pg.evaluate("() => window.__sim.setOversight(true)")
    pg.evaluate("() => window.__sim.setBudget(3)")
    pg.evaluate("() => window.__sim.seek(50)")
    pg.wait_for_timeout(250)
    pg.screenshot(path=f"{OUT}/full_budget2_t50.png", full_page=True)
    pg.evaluate("() => window.__sim.setOversight(false)")
    pg.evaluate("() => window.__sim.seek(88)")
    pg.wait_for_timeout(250)
    pg.screenshot(path=f"{OUT}/full_nooversight_t88.png", full_page=True)
    # tooltip hover over the HF production worker (node idx 5)
    pg.evaluate("() => window.__sim.seek(92)")
    pt = pg.evaluate("i => window.__sim.cardPoint(i)", 5)
    if pt:
        pg.mouse.move(pt["x"], pt["y"])
        pg.wait_for_timeout(200)
        pg.screenshot(path=f"{OUT}/f_tooltip.png")
    b.close()

print("JS errors/warnings:", len(errors))
for t, m in errors[:40]:
    print(f"  [{t}] {m[:300]}")
print("shots written to", OUT)
