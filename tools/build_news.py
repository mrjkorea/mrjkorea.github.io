# Rebuild news.json from the channel RSS (run before each deploy, or from a daily routine).
import re,json,urllib.request,datetime
CID="UCjX3Y0wqeJ51u_IrXs6oEnQ"  # @mrjenglishnews
x=urllib.request.urlopen(f"https://www.youtube.com/feeds/videos.xml?channel_id={CID}").read().decode()
out=[]
for e in re.findall(r"<entry>(.*?)</entry>",x,re.S):
  t=re.search(r"<title>(.*?)</title>",e).group(1).replace("&amp;","&")
  if "#Shorts" in t: continue
  m=re.search(r"([A-Z][a-z]+ \d{1,2}, \d{4})\s*$",t)
  d=datetime.datetime.strptime(m.group(1),"%B %d, %Y").date().isoformat() if m else re.search(r"<published>(.{10})",e).group(1)
  out.append({"id":re.search(r"<yt:videoId>(.*?)<",e).group(1),"title":t.split(" | ")[0],"date":d})
json.dump(out,open(__file__.rsplit("/",2)[0]+"/news.json","w"),indent=1); print(len(out),"videos")
