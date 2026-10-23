# Rebuild news.json from the channel RSS (run before each deploy, or from a daily routine).
import re,json,urllib.request,datetime,time,sys
CID="UCjX3Y0wqeJ51u_IrXs6oEnQ"  # @mrjenglishnews
URLS=[f"https://www.youtube.com/feeds/videos.xml?channel_id={CID}",f"https://www.youtube.com/feeds/videos.xml?playlist_id=UU{CID[2:]}"]
x=None
for i in range(4):
  for u in URLS:
    try:
      x=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) Chrome/124 Safari/537.36"}),timeout=20).read().decode(); break
    except Exception as ex: print("fetch failed",u,ex)
  if x: break
  time.sleep(20)
if not x: print("::warning::feed unavailable, kept old news.json"); sys.exit(0)
out=[]
for e in re.findall(r"<entry>(.*?)</entry>",x,re.S):
  t=re.search(r"<title>(.*?)</title>",e).group(1).replace("&amp;","&")
  if "#Shorts" in t: continue
  m=re.search(r"([A-Z][a-z]+ \d{1,2}, \d{4})\s*$",t)
  d=datetime.datetime.strptime(m.group(1),"%B %d, %Y").date().isoformat() if m else re.search(r"<published>(.{10})",e).group(1)
  out.append({"id":re.search(r"<yt:videoId>(.*?)<",e).group(1),"title":t.split(" | ")[0],"date":d})
json.dump(out,open(__file__.rsplit("/",2)[0]+"/news.json","w"),indent=1); print(len(out),"videos")
