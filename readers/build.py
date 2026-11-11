#!/usr/bin/env python3
"""Build the plain-text read-through site for the leveled readers.

Input:  nf/books-original-fixed.jsonl     (1567 books, each at its original page count)
        ~/OpenBot/Shared/picture-desc/books/<id>/*.jpg  (pictures made so far)
Output: readers-site/  (index.html, level-*.html, pics.html, books.json, books/)
"""
import json, os, glob, shutil, subprocess, html, sys

HERE = os.path.dirname(os.path.abspath(__file__))
AGENT = os.path.dirname(HERE)
SRC = os.path.join(AGENT, "nf", "books-original-fixed.jsonl")
PICS = os.path.expanduser("~/OpenBot/Shared/picture-desc/books")
OUT = HERE

LEVELS = ["aa", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
          "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "Z1", "Z2"]
LABEL = {"aa": "Starter (aa)"}

STYLE = """
:root{--ink:#1c1c1c;--muted:#6b6b6b;--rule:#e2ded6;--bg:#fbf9f4;--link:#1a5c8a}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
 font-family:Georgia,"Iowan Old Style","Times New Roman",serif;
 font-size:19px;line-height:1.55;-webkit-text-size-adjust:100%}
.wrap{max-width:720px;margin:0 auto;padding:18px 18px 90px}
a{color:var(--link)}
nav.top{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:15px;
 padding:10px 18px;border-bottom:1px solid var(--rule);background:#fff;
 position:sticky;top:0;display:flex;gap:14px;flex-wrap:wrap}
nav.top a{text-decoration:none;font-weight:600}
h1{font-size:27px;line-height:1.2;margin:22px 0 4px}
p.sub{font-family:system-ui,sans-serif;color:var(--muted);font-size:15px;margin:0 0 26px}
ul.levels{list-style:none;padding:0;margin:0}
ul.levels li{border-bottom:1px solid var(--rule)}
ul.levels a{display:flex;justify-content:space-between;align-items:baseline;
 padding:13px 2px;text-decoration:none;font-size:22px}
ul.levels .n{font-family:system-ui,sans-serif;font-size:15px;color:var(--muted)}
article{border-top:1px solid var(--rule);padding-top:18px;margin-top:30px}
article:first-of-type{border-top:0;margin-top:0}
h2{font-size:21px;margin:0 0 10px;line-height:1.25}
h2 .idx{font-family:system-ui,sans-serif;font-size:14px;color:var(--muted);font-weight:600}
p.pg{margin:0 0 9px;position:relative;padding-left:26px}
p.pg .n{position:absolute;left:0;top:3px;font-family:system-ui,sans-serif;
 font-size:12px;color:#b3aca0;width:20px;text-align:right}
p.pg.end{color:var(--muted)}
.note{font-family:system-ui,sans-serif;font-size:15px;color:var(--muted);
 background:#fff;border:1px solid var(--rule);border-radius:10px;padding:12px 14px;margin:24px 0}
ol.flagged{font-family:system-ui,sans-serif;font-size:15px;color:#444}
ol.flagged li{margin-bottom:6px}
@media print{nav.top{display:none}body{background:#fff;font-size:12pt}}
"""


def esc(s):
    return html.escape(s, quote=True)


def slug(level):
    return "level-%s.html" % level


def human(level):
    return LABEL.get(level, "Level %s" % level)


def page(title, body, nav=True, extra_style=""):
    n = ('<nav class="top"><a href="index.html">All levels</a>'
         '<a href="pics.html">Books with pictures</a></nav>') if nav else ""
    return ("<!DOCTYPE html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            "<title>%s</title><style>%s%s</style></head><body>%s"
            "<div class=\"wrap\">%s</div></body></html>\n"
            % (esc(title), STYLE, extra_style, n, body))


def main():
    books = [json.loads(l) for l in open(SRC, encoding="utf-8")]
    by_level = {lv: [] for lv in LEVELS}
    for b in books:
        by_level.setdefault(b["level"], []).append(b)
    for lv in by_level:
        by_level[lv].sort(key=lambda b: (b["title"].lower(), b["id"]))

    # ---- pictures on hand -------------------------------------------------
    pic_dirs = {}
    for d in glob.glob(os.path.join(PICS, "*")):
        if os.path.isdir(d):
            bid = os.path.basename(d)
            imgs = sorted(glob.glob(os.path.join(d, "*.jpg")) + glob.glob(os.path.join(d, "*.png")))
            if imgs:
                pic_dirs[bid] = imgs
    # only a book whose every page has a picture goes into the picture reader
    books_by_id = {str(b["id"]): b for b in books}
    for bid in list(pic_dirs):
        b = books_by_id.get(bid)
        if not b:
            pic_dirs.pop(bid)
            continue
        need = len(b["pages"])
        have = sum(1 for j in range(1, need + 1)
                   if any("_p%02d." % j in os.path.basename(f) for f in pic_dirs[bid]))
        if have != need:
            pic_dirs.pop(bid)
    print("picture books with every page drawn:", len(pic_dirs))

    # ---- level pages ------------------------------------------------------
    for lv, rows in by_level.items():
        parts = ["<h1>%s</h1>" % esc(human(lv)),
                 "<p class=\"sub\">%d books &middot; each at its original page count</p>" % len(rows)]
        for i, b in enumerate(rows, 1):
            parts.append("<article><h2><span class=\"idx\">%d.</span> %s</h2>"
                         % (i, esc(b["title"])))
            for j, p in enumerate(b["pages"], 1):
                cls = "pg end" if p.strip().rstrip(".").lower() == "the end" else "pg"
                parts.append("<p class=\"%s\"><span class=\"n\">%d</span>%s</p>"
                             % (cls, j, esc(p)))
            parts.append("</article>")
        open(os.path.join(OUT, slug(lv)), "w", encoding="utf-8").write(
            page("%s — leveled readers" % human(lv), "".join(parts)))

    # ---- picture reader ---------------------------------------------------
    pic_books = []
    for bid, imgs in pic_dirs.items():
        b = next((x for x in books if x["id"] == bid), None)
        if not b:
            continue
        pages = []
        for j, p in enumerate(b["pages"], 1):
            f = next((x for x in imgs if "_p%02d." % j in os.path.basename(x)), None)
            pages.append({"text": p,
                          "img": ("books/%s/%s" % (bid, os.path.basename(f))) if f else ""})
        pic_books.append({"id": bid, "title": b["title"], "level": b["level"], "pages": pages})
    pic_books.sort(key=lambda b: (LEVELS.index(b["level"]) if b["level"] in LEVELS else 99,
                                  b["title"].lower()))
    os.makedirs(os.path.join(OUT, "books"), exist_ok=True)
    for bid, imgs in pic_dirs.items():
        dest = os.path.join(OUT, "books", bid)
        os.makedirs(dest, exist_ok=True)
        for f in imgs:
            out = os.path.join(dest, os.path.basename(f).rsplit(".", 1)[0] + ".jpg")
            if not os.path.exists(out.rsplit(".", 1)[0] + ".webp"):
                subprocess.run(["cwebp", "-q", "70", "-resize", "720", "0", f, "-o",
                                out.rsplit(".", 1)[0] + ".webp"],
                               check=False, capture_output=True)
    # rewrite img paths to the webp files we actually wrote
    for b in pic_books:
        for p in b["pages"]:
            if p["img"]:
                p["img"] = p["img"].rsplit(".", 1)[0] + ".webp"
    json.dump(pic_books, open(os.path.join(OUT, "books.json"), "w", encoding="utf-8"),
              ensure_ascii=False)

    # ---- index ------------------------------------------------------------
    total = len(books)
    pics_n = len(pic_books)
    pic_total = sum(len(b["pages"]) for b in pic_books)
    flagged = [b for b in books if b.get("status") in ("needs_fix", "flagged", "unfinished")]
    rows = []
    for lv in LEVELS:
        n = len(by_level.get(lv, []))
        if not n:
            continue
        rows.append("<li><a href=\"%s\"><span>%s</span><span class=\"n\">%d books</span></a></li>"
                    % (slug(lv), esc(human(lv)), n))
    body = ["<h1>Leveled readers</h1>",
            "<p class=\"sub\">%d books &middot; each at its original page count &middot; plain text, no pictures</p>"
            % total,
            "<ul class=\"levels\">%s</ul>" % "".join(rows),
            "<div class=\"note\">Tap a level name to read every book in it top to bottom. "
            "The small grey number is the page number inside the book.</div>",
            "<h1 style=\"font-size:22px;margin-top:34px\">Books with pictures</h1>",
            "<p class=\"sub\">%d books have every page drawn &middot; %d pictures in all</p>" % (pics_n, pic_total),
            "<ul class=\"levels\"><li><a href=\"pics.html\"><span>Picture reader</span>"
            "<span class=\"n\">%d books</span></a></li></ul>" % pics_n]
    if flagged:
        items = "".join("<li>Level %s &middot; %s <span style=\"color:#888\">(%s)</span></li>"
                        % (esc(b["level"]), esc(b["title"]),
                           esc(", ".join(b.get("notes") or ["needs a look"])))
                        for b in flagged)
        body.append("<h1 style=\"font-size:22px;margin-top:34px\">Not finished yet</h1>"
                    "<p class=\"sub\">%d books still carry a note</p>"
                    "<ol class=\"flagged\">%s</ol>" % (len(flagged), items))
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(
        page("Leveled readers — read-through index", "".join(body)))

    # ---- picture reader page (same shape as the old readers look) ---------
    viewer = open(os.path.join(HERE, "pics-template.html"), encoding="utf-8").read()
    open(os.path.join(OUT, "pics.html"), "w", encoding="utf-8").write(viewer)

    print("books", total, "levels", len([1 for lv in LEVELS if by_level.get(lv)]),
          "picture books", pics_n, "flagged", len(flagged))


if __name__ == "__main__":
    main()
