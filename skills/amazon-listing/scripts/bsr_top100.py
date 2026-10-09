#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""BSR Top100 全量读取工具（stdlib only）

方法论：references/bsr-top100.md —— data-client-recs-list 骨架 + 并行补抓 dp 详情。
用法示例：
  python bsr_top100.py --url "https://www.amazon.com/gp/bestsellers/pc/<nodeId>" --output bsr100.json
  python bsr_top100.py --url ... --workers 4 --skeleton-only
"""
from __future__ import annotations
import argparse, html as htmllib, io, json, re, ssl, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE


def _get(url: str, headers: dict, timeout: int = 120, retries: int = 3) -> str:
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            return urllib.request.urlopen(req, timeout=timeout, context=ctx).read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            last = e
            wait = 8 * (i + 1)
            print(f"  retry {i+1}/{retries} after {wait}s: {e}", file=sys.stderr)
            time.sleep(wait)
    raise last


def fetch_skeleton(base_url: str, pages: int = 2) -> dict[int, str]:
    """返回 {rank: asin}，来自每页 data-client-recs-list JSON"""
    skeleton: dict[int, str] = {}
    for pg in range(1, pages + 1):
        url = f"{base_url}{'&' if '?' in base_url else '?'}pg={pg}"
        html_txt = _get(f"https://r.jina.ai/{url}",
                        {"User-Agent": "Mozilla/5.0", "Accept": "text/html",
                         "x-respond-with": "html", "x-timeout": "30"})
        m = re.search(r'data-client-recs-list="([^"]+)"', html_txt)
        if not m:
            print(f"pg={pg}: data-client-recs-list 未找到", file=sys.stderr)
            continue
        recs = json.loads(htmllib.unescape(m.group(1)))
        for r in recs:
            rank = int(r["metadataMap"]["render.zg.rank"])
            skeleton[rank] = r["id"]
        print(f"pg={pg}: skeleton +{len(recs)} (total ranks {len(skeleton)})")
    return skeleton


def fetch_detail(asin: str) -> dict:
    txt = _get(f"https://r.jina.ai/http://amazon.com/dp/{asin}",
               {"User-Agent": "Mozilla/5.0", "Accept": "text/plain"}, timeout=90)
    tm = re.search(r"Title: (.+?)\n", txt)
    title = (tm.group(1).strip() if tm else "")
    title = re.sub(r"^Amazon\.com:\s*", "", title)
    title = re.sub(r"\s*:\s*Electronics\s*$", "", title)
    stm = re.search(r"([0-9.]+) out of 5 stars", txt)
    rating = float(stm.group(1)) if stm else None
    vm = re.search(r"\(([0-9,]+)\)\s*\(?http://amazon\.com/dp/", txt)
    if not vm:
        vm2 = re.search(r"([0-9][0-9,]{2,}) (?:global )?ratings", txt)
        reviews = int(vm2.group(1).replace(",", "")) if vm2 else None
    else:
        reviews = int(vm.group(1).replace(",", ""))
    i = txt.find("This item:")
    price = None
    if i > -1:
        pm = re.search(r"\$([0-9]+\.[0-9]{2})", txt[i:i + 300])
        price = float(pm.group(1)) if pm else None
    return {"title": title, "rating": rating, "reviews": reviews, "price": price}


def lane_of(title: str | None) -> str:
    t = (title or "").lower()
    if any(k in t for k in ("usb c", "usbc", "type c", "type-c", "usb-c")):
        if any(k in t for k in ("hdmi", "dock", "ethernet", " pd ", "card reader")):
            return "usbc-dock"
        return "usbc-hub"
    if re.search(r"4[- ]?port|4 ports|4-port", t):
        return "a4-port"
    if "port" in t:
        return "a-multiport"
    return "other"


def main() -> int:
    ap = argparse.ArgumentParser(description="BSR Top100 full reader (Jina + recs-blob skeleton)")
    ap.add_argument("--url", required=True, help="BSR 类目首页 URL（不含 pg 参数）")
    ap.add_argument("--pages", type=int, default=2, help="页数，Top100=2")
    ap.add_argument("--workers", type=int, default=6, help="详情补抓并行线程")
    ap.add_argument("--output", default="bsr_top100_complete.json")
    ap.add_argument("--skeleton-only", action="store_true", help="只要 rank→ASIN 骨架，不补详情")
    args = ap.parse_args()

    skeleton = fetch_skeleton(args.url, args.pages)
    if not skeleton:
        print("骨架为空，失败", file=sys.stderr)
        return 2
    ranks = sorted(skeleton)
    print(f"skeleton: {len(skeleton)} ranks ({ranks[0]}–{ranks[-1]})")

    final = []
    need = []
    for r in ranks:
        row = {"rank": r, "asin": skeleton[r], "title": None, "rating": None,
               "reviews": None, "price": None, "src": "skeleton-only"}
        final.append(row)
        if not args.skeleton_only:
            need.append(row)

    if need:
        print(f"enriching {len(need)} items with {args.workers} workers...")
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futs = {ex.submit(fetch_detail, row["asin"]): row for row in need}
            done = 0
            for fut in as_completed(futs):
                row = futs[fut]
                done += 1
                try:
                    d = fut.result()
                    row.update(d); row["src"] = "dp"
                except Exception as e:  # noqa: BLE001
                    print(f"  #{row['rank']} {row['asin']} failed: {e}", file=sys.stderr)
                if done % 10 == 0:
                    print(f"  {done}/{len(need)}")
        # 429 尾部串行重试
        for row in need:
            if row["src"] != "dp":
                for attempt in range(3):
                    try:
                        row.update(fetch_detail(row["asin"])); row["src"] = "dp"
                        print(f"  serial retry OK #{row['rank']}")
                        break
                    except Exception as e:  # noqa: BLE001
                        print(f"  serial retry #{row['rank']} attempt{attempt+1}: {e}", file=sys.stderr)
                        time.sleep(8)

    for row in final:
        row["lane"] = lane_of(row.get("title"))
    final.sort(key=lambda x: x["rank"])
    with io.open(args.output, "w", encoding="utf-8") as fh:
        json.dump(final, fh, ensure_ascii=False, indent=1)
    have = sum(1 for x in final if x.get("title"))
    print(f"saved {args.output}: {len(final)} rows, {have} with title")
    return 0 if have == len(final) or args.skeleton_only else 1


if __name__ == "__main__":
    raise SystemExit(main())
