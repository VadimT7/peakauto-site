#!/usr/bin/env python3
"""Refresh PEAKAUTO stock from 999.md: GraphQL ad list + per-ad SSR pages.

Writes data/ads_list.json and data/cars_full.json; then run build_data.py.
"""
import json, os, re, time, html as htmllib, urllib.request

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
BASE = os.path.join(os.path.dirname(__file__), "..", "data")

LIST_QUERY = """query ProfileAds($input: Ads_ProfileInput) {
  profileAds(input: $input) {
    count
    ads {
      id
      title
      price: feature(id: 2) { value }
      images: feature(id: 14) { value }
      carFuel: feature(id: 151) { value }
      carDrive: feature(id: 108) { value }
      carTransmission: feature(id: 101) { value }
      mileage: feature(id: 104) { value }
      engineVolume: feature(id: 103) { value }
      transportYear: feature(id: 19) { value }
    }
  }
}"""

FEAT_RE = re.compile(
    r'<span class="styles_group__key__[^"]*">([^<]+)</span>'
    r'<span class="styles_dotted__line__[^"]*"></span>'
    r'(?:<a[^>]*>([^<]*)</a>|<span class="styles_group__value__[^"]*">([^<]*)</span>)'
)
DESC_RE = re.compile(r'"description":"((?:[^"\\]|\\.)*)"')
TITLE_RE = re.compile(r'<meta property="og:title" content="([^"]*)"')


def fetch(url, data=None, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={
                "User-Agent": UA,
                "Accept-Language": "ro,ru;q=0.9",
                "Content-Type": "application/json",
                "Origin": "https://999.md",
                "Referer": "https://999.md/ro/profile/PEAKAUTO",
            })
            return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2)


def fetch_list():
    body = json.dumps({
        "operationName": "ProfileAds",
        "variables": {"input": {"login": "PEAKAUTO", "viewType": "VIEW_LIST_PHOTO",
                                "pagination": {"limit": 200, "skip": 0}}},
        "query": LIST_QUERY,
    }).encode()
    data = json.loads(fetch("https://999.md/graphql", data=body))
    if "errors" in data:
        raise SystemExit("GraphQL errors: " + json.dumps(data["errors"])[:300])
    json.dump(data, open(f"{BASE}/ads_list.json", "w"), ensure_ascii=False, indent=1)
    return data["data"]["profileAds"]["ads"]


def scrape_ad(ad, idx, total):
    aid = ad["id"]
    page = fetch(f"https://999.md/ro/{aid}")
    feats = {}
    for m in FEAT_RE.finditer(page):
        k = htmllib.unescape(m.group(1)).strip()
        v = htmllib.unescape(m.group(2) or m.group(3) or "").strip()
        if k and v and k not in feats:
            feats[k] = v
    desc = ""
    dm = DESC_RE.search(page)
    if dm:
        try:
            desc = json.loads('"' + dm.group(1) + '"')
        except Exception:
            desc = dm.group(1)
    tm = TITLE_RE.search(page)
    print(f"[{idx}/{total}] {aid} {ad['title']} feats={len(feats)} desc={len(desc)}", flush=True)
    return {
        "id": aid,
        "listTitle": ad["title"],
        "ogTitle": htmllib.unescape(tm.group(1)) if tm else ad["title"],
        "price": (ad.get("price") or {}).get("value"),
        "images": (ad.get("images") or {}).get("value") or [],
        "fuel": ((ad.get("carFuel") or {}).get("value") or {}).get("translated"),
        "drive": ((ad.get("carDrive") or {}).get("value") or {}).get("translated"),
        "transmission": ((ad.get("carTransmission") or {}).get("value") or {}).get("translated"),
        "mileage": ((ad.get("mileage") or {}).get("value") or {}).get("value"),
        "engineVolume": ((ad.get("engineVolume") or {}).get("value") or {}).get("value"),
        "year": (ad.get("transportYear") or {}).get("value"),
        "features": feats,
        "description": desc,
    }


if __name__ == "__main__":
    ads = fetch_list()
    print(f"list: {len(ads)} ads")
    out = []
    for i, ad in enumerate(ads):
        try:
            out.append(scrape_ad(ad, i + 1, len(ads)))
        except Exception as e:
            print(f"[{i+1}/{len(ads)}] {ad['id']} FAILED: {e}", flush=True)
        time.sleep(0.6)
    json.dump(out, open(f"{BASE}/cars_full.json", "w"), ensure_ascii=False, indent=1)
    print("DONE", len(out), "- now run: python3 tools/build_data.py")
