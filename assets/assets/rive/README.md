# Rive assets

Both files are optional. Without them the app uses its built-in background
and line icons. Make them in the Rive editor (rive.app), export as `.riv`, and
drop them in this folder. Paths can be changed in `CrossMenuConfig.rive`.

The engine drives both through **data binding** (state machine inputs are
deprecated in the Rive runtime). In each artboard, create a View Model with
the properties below, bind them in your state machine, and mark the default
instance as **exported** so the runtime can auto-bind it. Missing properties
are skipped, so you can add them gradually.

## `background.riv`: full-screen background

Uses the **default artboard** and its **default state machine**, scaled to
cover the window. It's drawn with the Rive renderer as one GPU surface.

| Property | Type | Set by the engine |
|---|---|---|
| `top` | Color | Gradient top colour for the current palette and time of day |
| `bottom` | Color | Gradient bottom colour |
| `day` | Number | 0 at midnight → 1 at noon → 0 at midnight |

The engine pauses the scene when Background motion is Off, and while a screen
is open (if `pauseBackgroundBehindScreens` is on). Keep the scene light: it
is redrawn every frame while it animates.

## `icons.riv`: menu icons

One **artboard per icon**, named exactly like the item's `icon` key
(`home`, `gear`, `palette`, `info`…). Icons without an artboard fall back to
the built-in line icon, so you can replace them one at a time. Square
artboards work best (they're drawn with `contain` in a square box).

Icons are drawn with the Flutter renderer, straight into Flutter's canvas.
That keeps them crisp at any scale and needs no extra GPU textures. The
engine scales the icon up when selected; the artboard handles everything
else.

| Property | Type | Set by the engine |
|---|---|---|
| `selected` | Boolean | True for the selected category/item |
| `emphasis` | Number | 0–1: how visible the icon should be. Bind it to the artboard's opacity. Unselected categories are 0.55, items fade with distance from the selection. |

If an icon has no `emphasis` property, the engine fades it with an opacity
layer instead, which costs an extra GPU pass per icon, so prefer binding it.

## Performance notes

- Rive icons only exist for the categories and the visible item column, and
  a settled state machine stops redrawing.
- Prefer vector shapes over images, and keep state machines simple.
