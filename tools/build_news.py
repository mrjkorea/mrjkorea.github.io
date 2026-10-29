# Rebuild news.json from the channel RSS + merge with existing list.
# HARD: run after each weekday YouTube post so Study World shows today's long video.
# Usage: python3 tools/build_news.py [YYYY-MM-DD] [videoId] [optional title]
import re, json, urllib.request, datetime, time, sys
from pathlib import Path
CID = "UCjX3Y0wqeJ51u_IrXs6oEnQ"  # @mrjenglishnews
URLS = [
    f"https://www.youtube.com/feeds/videos.xml?channel_id={CID}",
    f"https://www.youtube.com/feeds/videos.xml?playlist_id=UU{CID[2:]}",
]
ROOT = Path(__file__).resolve().parents[1]
NEWS = ROOT / "news.json"
KEEP = 20

def parse_title_date(title: str):
    m = re.search(r"([A-Za-z]+ \d{1,2}, \d{4})\s*$", title)
    if not m:
        return None
    s = m.group(1)
    for fmt in ("%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            pass
    return None

def clean_title(t: str) -> str:
    t = t.replace("&amp;", "&").replace("\\u0026", "&")
    t = t.split(" | ")[0].strip()
    if t.lower().startswith("easy english news:"):
        t = t[len("Easy English News:"):].strip()
    t = re.sub(r"[….]+$", "", t).strip()
    return t

def was_ellipsis_truncated(raw: str) -> bool:
    first = raw.split(" | ")[0]
    return ("…" in first) or first.rstrip().endswith("...")

x = None
for _ in range(4):
    for u in URLS:
        try:
            x = urllib.request.urlopen(
                urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/124 Safari/537.36"}),
                timeout=20,
            ).read().decode()
            break
        except Exception as ex:
            print("fetch failed", u, ex)
    if x:
        break
    time.sleep(20)

by_id = {}
shorts_by_title_date = {}  # title-date -> short headline (not WOTD)
if x:
    # Pass 1: collect short headlines keyed by THEIR title-date if present else skip
    for e in re.findall(r"<entry>(.*?)</entry>", x, re.S):
        raw = re.search(r"<title>(.*?)</title>", e).group(1)
        if "#Shorts" not in raw:
            continue
        st = clean_title(raw)
        if st.lower().startswith("word of the day"):
            continue
        # Prefer matching long by same calendar day from short's published KST-ish: use pub date only as weak hint
        pub = re.search(r"<published>(.{10})", e).group(1)
        shorts_by_title_date.setdefault(pub, st)

    for e in re.findall(r"<entry>(.*?)</entry>", x, re.S):
        raw = re.search(r"<title>(.*?)</title>", e).group(1)
        if "#Shorts" in raw:
            continue
        vid = re.search(r"<yt:videoId>(.*?)<", e).group(1)
        pub = re.search(r"<published>(.{10})", e).group(1)
        d = parse_title_date(raw) or pub
        title = clean_title(raw)
        if was_ellipsis_truncated(raw):
            # Prefer CLI/day-folder title later; else keep cleaned truncated form (merge keeps old good titles)
            pass
        by_id[vid] = {"id": vid, "title": title, "date": d}

# CLI override wins (from post_day after upload)
if len(sys.argv) >= 3:
    d, vid = sys.argv[1], sys.argv[2]
    title = sys.argv[3] if len(sys.argv) >= 4 else by_id.get(vid, {}).get("title") or vid
    by_id[vid] = {"id": vid, "title": title, "date": d}
    print("override", d, vid, title[:70])

# Seed from known-good base if provided via NEWS_BASE env, else current NEWS
base_path = Path(__import__("os").environ.get("NEWS_BASE", str(NEWS)))
if base_path.exists():
    try:
        for row in json.loads(base_path.read_text()):
            rid = row.get("id")
            if not rid:
                continue
            if rid not in by_id:
                by_id[rid] = row
            else:
                # Keep prior good title when new RSS title is ellipsis-truncated
                new_t = by_id[rid].get("title", "")
                old_t = row.get("title", "")
                if was_ellipsis_truncated(new_t) or (len(new_t) < len(old_t) and old_t):
                    # only replace title if override didn't set this id today via CLI — CLI already in by_id with good title
                    if len(sys.argv) >= 3 and rid == sys.argv[2]:
                        pass
                    elif old_t and (not new_t or new_t.endswith(("Engl", "Risk", "Af", "S", "Risk")) or "…" in new_t):
                        by_id[rid]["title"] = old_t
                # Prefer existing date if RSS used published UTC day
                if row.get("date") and by_id[rid].get("date") and row["date"] > by_id[rid]["date"]:
                    pass
    except Exception as ex:
        print("keep-old failed", ex)

out = sorted(by_id.values(), key=lambda r: r.get("date", ""), reverse=True)[:KEEP]
NEWS.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(len(out), "videos")
for row in out[:6]:
    print(row["date"], row["id"], row["title"][:70])
