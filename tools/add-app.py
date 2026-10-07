"""Add a finished app to the launcher, the top-level service worker and the README.

Usage (from anywhere):
  python3 tools/add-app.py <folder> "<Name>" "<what: one line for the tile>" "<README description>" [extra files...]

Extra files are additional pages in the folder to cache offline (e.g. "drill-press.html").
It bumps the top-level "toybox-vN" cache. The app's manifest and icons must already exist (an app has no sw.js of its own: the top-level one serves everything).
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
folder, name, what, desc = sys.argv[1:5]
extra = sys.argv[5:]

s = open("index.html").read()
assert '      href: "%s/"' % folder not in s, "already in the launcher"
entry = ',\n    {\n      name: "%s",\n      what: "%s",\n      href: "%s/",\n      icon: "%s/icons/icon-512.png"\n    }\n  ];' % (name, what, folder, folder)
s = re.sub(r'\n    \}\n  \];', '\n    }' + entry, s, count=1)
open("index.html", "w").write(s)

s = open("sw.js").read()
n = int(re.search(r'toybox-v(\d+)', s).group(1))
s = s.replace('toybox-v%d"' % n, 'toybox-v%d"' % (n + 1))
files = (["./%s/" % folder, "./%s/index.html" % folder] + ["./%s/%s" % (folder, e) for e in extra] +
         ["./%s/manifest.webmanifest" % folder] +
         ["./%s/icons/%s" % (folder, i) for i in ["icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"]])
block = ',\n\n  // %s\n' % name + ',\n'.join('  "%s"' % f for f in files) + '\n];'
s = re.sub(r'"\n\];', '"' + block, s, count=1)
open("sw.js", "w").write(s)
for f in files:
    if not f.endswith("/"):
        assert os.path.exists(f), "missing " + f

s = open("README.md").read()
rows = re.findall(r'^\| .* \| \[`.*`\]\(.*\) \|$', s, re.M)
s = s.replace(rows[-1], rows[-1] + "\n| %s: %s | [`%s/`](%s/) |" % (name, desc, folder, folder))
open("README.md", "w").write(s)
print("ok, top-level cache is now toybox-v%d" % (n + 1))
