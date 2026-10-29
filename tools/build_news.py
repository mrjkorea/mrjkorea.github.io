# Rebuild news.json from the channel RSS + merge with existing list.
# HARD: run after each weekday YouTube post so Study World shows today's long video.
# Usage: python3 tools/build_news.py [YYYY-MM-DD] [videoId] [optional title]
import re,json,urllib.request,datetime,time,sys
from pathlib import Path
CID="UCjX3Y0wqeJ51u_IrXs6oEnQ"  # @mrjenglishnews
URLS=[f"https://www.youtube.com/feeds/videos.xml?channel_id={CID}",f"https://www.youtube.com/feeds/videos.xml?playlist_id=UU{CID[2:]}"]
ROOT=Path(__file__).resolve().parents[1]
NEWS=ROOT/"news.json"
KEEP=20

def parse_title_date(title:str):
  m=re.search(r"([A-Za-z]+ \d{1,2}, \d{4})\s*$", title)
  if not m: return None
  s=m.group(1)
  for fmt in ("%B %d, %Y", "%b %d, %Y"):
    try: return datetime.datetime.strptime(s, fmt).date().isoformat()
    except ValueError: pass
  return None

def clean_title(t:str)->str:
  t=t.replace("&amp;","&").replace("\\u0026","&")
  t=t.split(" | ")[0].strip()
  if t.lower().startswith("easy english news:"):
    t=t[len("Easy English News:"):].strip()
  t=re.sub(r"[….]+$","",t).strip()
  return t

def truncated(t:str)->bool:
  # SEO titles cut mid-word at YouTube's 100-char limit
  if not t: return True
  if t.endswith(("…","...")): return True
  # ends with a short incomplete token like "Engl" / "Af" / "S"
  last=t.split()[-1] if t.split() else ""
  return len(last)<=4 and last[:1].isupper() and last.isalpha() and last.lower() not in {"uk","us","un","eu","ai","tv","dna","nasa","fifa"}

x=None
for _ in range(4):
  for u in URLS:
    try:
      x=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) Chrome/124 Safari/537.36"}),timeout=20).read().decode(); break
    except Exception as ex: print("fetch failed",u,ex)
  if x: break
  time.sleep(20)

by_id={}
shorts_by_day={}  # date -> best non-WOTD short title
if x:
  for e in re.findall(r"<entry>(.*?)</entry>",x,re.S):
    raw=re.search(r"<title>(.*?)</title>",e).group(1)
    vid=re.search(r"<yt:videoId>(.*?)<",e).group(1)
    pub=re.search(r"<published>(.{10})",e).group(1)
    d=parse_title_date(raw) or pub
    if "#Shorts" in raw:
      st=clean_title(raw)
      if st.lower().startswith("word of the day"): continue
      shorts_by_day.setdefault(d, st)
      continue
    title=clean_title(raw)
    if truncated(title) and d in shorts_by_day:
      title=shorts_by_day[d]
    by_id[vid]={"id":vid,"title":title,"date":d}

# CLI override wins (from post_day after upload)
if len(sys.argv)>=3:
  d,vid=sys.argv[1],sys.argv[2]
  title=sys.argv[3] if len(sys.argv)>=4 else by_id.get(vid,{}).get("title") or shorts_by_day.get(d) or vid
  by_id[vid]={"id":vid,"title":title,"date":d}
  print("override", d, vid, title[:70])

# merge existing so older longs stay when RSS is Shorts-heavy
if NEWS.exists():
  try:
    for row in json.loads(NEWS.read_text()):
      if row.get("id") and row["id"] not in by_id:
        by_id[row["id"]]=row
  except Exception as ex:
    print("keep-old failed", ex)

out=sorted(by_id.values(), key=lambda r: r.get("date",""), reverse=True)[:KEEP]
NEWS.write_text(json.dumps(out, indent=1, ensure_ascii=False)+"\n")
print(len(out),"videos")
for row in out[:5]:
  print(row["date"], row["id"], row["title"][:70])
