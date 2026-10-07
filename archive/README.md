# Archive

Apps the dad shelved. They have no tile on the Toybox home screen and the home screen does not save them for
offline use, but they still run from here (open `archive/<app>/` directly).

- `fish-tank/`: Fish Tank.
- `color-mixing/`: Color Mixing.

To bring one back: move its folder to the top level, change `../../common/` back to `../common/` and the Home link
`../../` back to `../` (in `index.html` and `sw.js`), then add it with `tools/add-app.py`.
