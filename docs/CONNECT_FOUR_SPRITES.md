# Connect Four custom sprites

Connect Four supports optional, replaceable local art. The gameplay stays server-authoritative; these files change only how the desktop screen is drawn.

## Asset folder

Add your generated images below:

`apps/web/public/game-assets/connect-four/`

Then edit `apps/web/public/game-assets/connect-four/theme.json`. All paths must start with `/game-assets/connect-four/`. Leave a value as an empty string to use the built-in CSS fallback.

Example configuration:

```json
{
  "version": 1,
  "sprites": {
    "boardOverlay": "/game-assets/connect-four/sprites/blue-faceplate.png",
    "redDisc": "/game-assets/connect-four/sprites/red-disc.png",
    "yellowDisc": "/game-assets/connect-four/sprites/yellow-disc.png",
    "dropIndicator": "/game-assets/connect-four/sprites/drop-marker.png",
    "redPlayerBadge": "",
    "yellowPlayerBadge": "",
    "screenBackground": ""
  }
}
```

Create the `sprites` subfolder yourself if you use that example. The patch does not bundle placeholder or licensed art files.

## What each sprite should contain

| Key | Recommended image | Design requirements |
|---|---|---|
| `boardOverlay` | Transparent PNG, 677×369 (about 1.835:1) | Optional board artwork with six rows of seven transparent holes. The app preserves the artwork aspect ratio and aligns its live 7×6 grid to the hole field. |
| `redDisc` | Transparent PNG/WebP, 512×512 | One centered glossy red game disc, no lettering and no background. Keep the outer silhouette within about 90% of the canvas. |
| `yellowDisc` | Transparent PNG/WebP, 512×512 | Same framing as the red disc, but yellow/gold. Matching dimensions make the animation consistent. |
| `dropIndicator` | Transparent PNG/WebP/SVG, 256×256 | A small disc or drop cue used over the column selector. The selected player's color still determines the fallback if this is blank. |
| `redPlayerBadge` | Transparent PNG/WebP, 256×256 | Optional custom red player token in the right-side player panel. If blank, `redDisc` is reused; otherwise a CSS disc is shown. |
| `yellowPlayerBadge` | Transparent PNG/WebP, 256×256 | Optional custom yellow player token in the right-side player panel. If blank, `yellowDisc` is reused; otherwise a CSS disc is shown. |
| `screenBackground` | Optional 1920×1080 image | Subtle/dark backdrop texture. A dark overlay remains on top for text contrast. |

**Important for board art:** the board has seven columns and six rows. The current board overlay uses a 677×369 image canvas and aligns the live grid at 17.2% from the left, 6.2% from the top, with a width of 65.6% and height of 84.8%. Do not render red/yellow pieces into the board image; the pieces are live elements and animate when dropped. Do not include a second set of buttons/controls. Leave `boardOverlay` empty to use the built-in board.

Disc images should be square and tightly cropped around the visible disc, with only a small transparent margin. Large transparent margins make the disc appear undersized inside its slot.

## Make and preview your own theme

1. Generate each asset independently using the size and transparency recommendations above.
2. Copy the files into the local asset folder.
3. Edit `theme.json` to reference the exact filenames.
4. Refresh the browser with `Ctrl+F5`. If a sprite doesn't load, that sprite falls back to the built-in CSS rendering rather than breaking the board.

Keep the art with transparent backgrounds wherever requested. PNG is the safest format for board overlays and pieces; SVG is also fine for a simple drop indicator. Paths are local to your app and do not require any external image host or app install.

## Prompt starters for generating your own art

Use these as starting prompts in your preferred image generator. For `boardOverlay`, transparency and exact geometry matter more than extra decoration; inspect the result and correct the transparent hole centers if the generator makes them opaque or uneven.

**Blue board faceplate**

> Create a flat, straight-on orthographic 2D game UI sprite for a classic Connect Four board faceplate. Transparent PNG, exactly 1400×1200 pixels, 7:6 aspect ratio. Bright molded cobalt-blue plastic faceplate with clean deep-blue cell dividers and 42 precisely aligned recessed circular hole rims in exactly 7 columns and 6 rows. No perspective, no camera angle, no text, no logo, no feet, no top rail, no game pieces, no drop buttons. Outside the plastic frame and the exact circular center of every hole must be fully transparent alpha; only the plastic ribs, edges and rims remain opaque. All rows and columns perfectly evenly spaced; hole centers align to the exact centers of a 7×6 grid.

**Red game disc**

> Create one isolated generic classic Connect Four red plastic playing disc, front-facing perfect circle, glossy molded red plastic with a restrained highlight and subtle bevel, transparent PNG 512×512, centered with 5% transparent padding, no text, no logo, no other objects, no shadows outside the disc silhouette.

**Yellow game disc**

> Match the framing and lighting of a classic Connect Four red disc sprite, but make the disc vivid golden yellow plastic. Front-facing perfect circle, transparent PNG 512×512, centered with 5% transparent padding, subtle glossy highlight and bevel, no text, logo, background, or external shadow.

**Column drop marker**

> Create a small, isolated, front-facing glossy golden-yellow plastic disc/drop indicator for a classic Connect Four browser game. Transparent PNG 256×256, centered, no text, no logo, no background, subtle bevel, clean silhouette.

Avoid putting the board label or score UI into any sprite. The app renders player names, buttons, score and activity text as real HTML so it remains crisp and easy to change.
