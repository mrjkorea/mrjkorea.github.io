import sys,re
from playwright.sync_api import sync_playwright
U=sys.argv[1]; out=sys.argv[2] if len(sys.argv)>2 else None
with sync_playwright() as p:
  br=p.chromium.launch(); ctx=br.new_context(viewport={"width":1440,"height":900}); pg=ctx.new_page(); errs=[]
  pg.on("pageerror",lambda e:errs.append(str(e)))
  if "github.io" in U:
    import json
    ctx.route("**/script.google.com/**",lambda r:r.fulfill(status=200,content_type="application/json",body=json.dumps({"ok":True,"id":"testkid","token":"t","progress":[],"found":False,"progress_json":""})))
    pg.goto(U); pg.wait_for_timeout(1500); g=pg.locator("#mrj-auth-gate"); g.get_by_role("button",name="I already have an ID").click(); i=g.locator("input"); i.nth(0).fill("testkid"); i.nth(1).fill("dummy"); g.get_by_role("button",name="Log in").click(); pg.wait_for_timeout(2000)
  pg.goto(U+"#news/0XLW95GTLv8"); pg.wait_for_timeout(4000)
  pg.locator("#yt").click(); pg.wait_for_timeout(5000)
  def cap():
    f=[f for f in pg.frames if "youtube" in f.url and "embed" in f.url][0]
    return f.evaluate("[...document.querySelectorAll('.ytp-caption-segment')].map(e=>e.textContent).join(' ')")
  print("EN:",cap())
  pg.get_by_role("button",name=re.compile("한국어")).click(); pg.wait_for_timeout(6000)
  k=cap(); print("KO:",k, "hangul:",bool(re.search("[가-힣]",k)))
  if out: pg.screenshot(path=out)
  pg.get_by_role("button",name="🚫 Subtitles off").click(); pg.wait_for_timeout(3000); print("OFF:",repr(cap()))
  pg.get_by_role("button",name="💬 English subtitles").click(); pg.wait_for_timeout(5000); print("EN again:",cap())
  print("errors:",errs); br.close()
