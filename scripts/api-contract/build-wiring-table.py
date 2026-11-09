#!/usr/bin/env python3
"""
Builds docs/api-wiring.md: Feature | App | Screen | Service function | Endpoint | Status.

    node scripts/api-contract/check-api-contract.mjs --json > /tmp/inv.json
    python3 scripts/api-contract/build-wiring-table.py /tmp/inv.json

A screen counts as wired when a screen/component/hook file references the service function
(directly or through other service functions, up to 4 levels). Statuses for endpoints fixed in
the integration pass are listed in FIXED below.
"""
import collections, json, os, re, sys

inv = json.load(open(sys.argv[1]))
contract = json.load(open("docs/api-contract.json"))

FN = re.compile(
    r"(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*[<(]"
    r"|(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*(?::[^=]+)?=>"
    r"|^\s{2,6}(\w+)\s*:\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]+)?=>"
    r"|^\s{2,6}(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{",
    re.M,
)
KEYWORDS = {"if", "for", "while", "switch", "catch", "return", "function"}
SCREEN = re.compile(r"/(app|components|hooks|contexts)/")

texts = {}
for root in ("apps/gully-fame-mobile/app", "apps/gully-fame-mobile/src", "apps/gully-fame-admin/app",
             "apps/gully-fame-admin/lib", "apps/gully-fame-admin/components"):
    for r, _, fs in os.walk(root):
        if "__tests__" in r:
            continue
        for f in fs:
            if f.endswith((".ts", ".tsx", ".js")):
                texts[os.path.join(r, f)] = open(os.path.join(r, f)).read()


def enclosing(src, idx):
    best = None
    for m in FN.finditer(src[:idx]):
        name = next(g for g in m.groups() if g)
        if name not in KEYWORDS:
            best = name
    return best


def screen(func, home, app, depth=0, seen=None):
    seen = seen if seen is not None else set()
    if (func, home) in seen:
        return None
    seen.add((func, home))
    word = re.compile(r"(?<![\w$])" + re.escape(func) + r"(?![\w$])")
    later = []
    for f, s in texts.items():
        if ("mobile" in app) != ("gully-fame-mobile" in f):
            continue
        for m in word.finditer(s):
            ls = s.rfind("\n", 0, m.start()) + 1
            le = s.find("\n", m.start())
            line = s[ls: le if le > 0 else len(s)]
            if re.match(r"\s*(import|export\s*\{|export\s+\*)", line) or re.match(r"\s*\w+,?\s*$", line):
                continue
            if re.search(r"(function\s+|const\s+)" + re.escape(func) + r"\b", line):
                continue
            if f != home and SCREEN.search(f):
                return f
            outer = enclosing(s, m.start())
            if outer and outer != func:
                later.append((outer, f))
    if depth < 4:
        for outer, f in later:
            r = screen(outer, f, app, depth + 1, seen)
            if r:
                return r
    return None


shape = lambda p: re.sub(r":[^/]+", ":", p)
FIXED = {
    "POST admin/competitions/:/active": "Fixed (was .../approve)",
    "PUT admin/users/:/status": "Fixed (body isActive)",
    "PUT admin/users/:/kyc": "Fixed (field reason)",
    "POST public/logo": "Fixed (splash via public/logo, no token)",
    "GET admin/faqs": "Fixed (mobile: no isActive query)",
    "GET user/:/followers": "Fixed (follower count wired)",
    "GET user/:/following": "Fixed (following count wired)",
}
GROUPS = [("auth/", "Auth"), ("admin/login", "Admin auth"), ("admin/getDetails", "Admin auth"), ("user/profile", "Profile"),
          ("user/homeScreen", "Home screen"), ("user/categories", "Categories"), ("user/champ", "Champions"),
          ("competitions", "Competitions"), ("user/competitions", "Competitions"), ("feed/", "Feed / matrix"),
          ("reels", "Reels"), ("search", "Search"), ("user/kyc", "KYC"), ("user/audio", "Saved audio"),
          ("user/wallet", "Wallet"), ("user/:", "Follow"), ("notification", "Notifications"),
          ("user/notifications", "Notifications"), ("chat/", "Chats"), ("user/progress", "Gamification"),
          ("user/daily-mission", "Gamification"), ("public/", "Public content"), ("admin/dashboard", "Admin dashboard"),
          ("admin/banners", "Admin banners"), ("admin/categories", "Admin categories"),
          ("admin/termAndCondition", "Admin CMS"), ("admin/aboutUs", "Admin CMS"), ("admin/privacyPolicy", "Admin CMS"),
          ("admin/competitionRules", "Admin CMS"), ("admin/users", "Admin users"), ("admin/competitions", "Admin competitions"),
          ("admin/sponsors", "Admin sponsors"), ("admin/earnings", "Admin earnings/winners"),
          ("admin/winners", "Admin earnings/winners"), ("admin/reports", "Admin reports"), ("admin/audio", "Admin media library"),
          ("admin/filters", "Admin media library"), ("admin/stickers", "Admin media library"),
          ("admin/soundfx", "Admin media library"), ("admin/contactUs", "Contact us"), ("admin/faqs", "FAQs")]


def group(p):
    best, name = "", "Other"
    for pre, g in GROUPS:
        if p.startswith(pre) and len(pre) > len(best):
            best, name = pre, g
    return name


rows, seen, stat = [], set(), collections.Counter()
for r in inv["results"]:
    if r["file"].endswith("api/client.ts"):
        continue
    src = texts.get(r["file"], "")
    idx = sum(len(l) + 1 for l in src.split("\n")[: r["line"]]) - 1  # end of the call's line
    func = enclosing(src, idx) or "?"
    key = (r["method"], shape(r["path"]), r["file"], func)
    if key in seen:
        continue
    seen.add(key)
    k = f'{r["method"]} {shape(r["path"])}'
    status = "Not in collection" if (not r["inCollection"] or r["methodOk"] is False) else FIXED.get(k, "OK")
    sc = r["file"] if SCREEN.search(r["file"]) else screen(func, r["file"], r["app"])
    if not sc and status == "OK":
        status = "Service only (no screen uses it)"
    stat[status.split(" (")[0]] += 1
    rows.append((group(r["path"]), r["app"], (sc or "-").replace("apps/", ""), f"{func}()",
                 f"{r['method']} {r['path']}", r["file"].replace("apps/", ""), status))
rows.sort()

out = ["# API wiring (screen -> service -> endpoint)", "",
       "Generated by `scripts/api-contract/build-wiring-table.py` from the contract scanner.",
       '"Service only" = a service function exists but no screen uses it (not built, per scope).', "",
       "| Feature | App | Screen / component | Service function (file) | Endpoint | Status |", "|---|---|---|---|---|---|"]
out += [f"| {a} | {b} | {c} | {d} ({f.split('/')[-1]}) | `{e}` | {g} |" for a, b, c, d, e, f, g in rows]
used = {(x["method"], shape(x["path"])) for x in inv["results"]} | {("GET", shape(x["path"])) for x in inv["results"] if x["method"] == "?"}
out += ["", "## Collection endpoints the frontend never calls", "", "| Auth | Method | Path |", "|---|---|---|"]
for e in contract["endpoints"]:
    if (e["method"], shape(e["path"])) not in used:
        out.append(f"| {e['auth']} | {e['method']} | `{e['path']}` |")
open("docs/api-wiring.md", "w").write("\n".join(out) + "\n")
print(dict(stat))
for row in rows:
    if row[6].startswith("Service only"):
        print("  service only:", row[1], row[4], row[3])
