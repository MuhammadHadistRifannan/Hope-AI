# BRIEF: Hope.Ai, "Jendela Dunia"

Interviewed 21 Oct 2026. User answers are quoted verbatim. Where the user left a topic open or said they did
not understand it, the decision is labelled **Authored** and marked as an assumption.

## The eight topics

1. **Vibe and references.** "ceria referensi seperti di film kartun UP , atau BIG HERO"
2. **The scroll journey.** "Pengunjung melihat full jendela dan ketika scroll kebawah , web akan seolah olah
   membawa pengunjung keluar dari jendela POV secara First Person , ini berati HopeAi adalah jendela dunia.
   lalu setelah itu baru pengenalan fitur fitur HOPEAI di section berikutnnya seperti biasa."
3. **The energy curve.** User: "masih belum paham". **Authored:** calm inside the room, rising as the
   curtains open and the camera moves to the glass, loudest the moment the visitor is outside in the sky,
   then settling as the world lands into the feature section.
4. **Feeling and the one moment.** "Canggih dan Memorable". **Authored peak** (see below).
5. **The thing no other site does.** "Ketika di scroll seperti seolah olah ada deep interaction jadi bukan
   hanya gambar statis tetapi seperti kita masuk ke dalam nya dan berada di time line scroll nya."
6. **Range.** "maximalist , tetapi padat"
7. **One world or scenes.** "satu dunia yang tak terputus , namun jangan mengubah font atau ciri khas maskot
   dari HopeAI"
8. **Assets.** No answer. **Authored assumption:** no kie.ai (paid, no key in the project). The world is
   drawn in code (SVG and CSS) as a bright cartoon illustration, which fits the references and the existing
   brand (penguin mascot, cartoon GIFs). Existing assets used: `public/anim/penguin.webp` and
   `penguin-still.webp` (alpha), `public/parallax/s2/3.png` (grass, alpha), `public/images/logo.png`.

## Brand rules that bind the build

- Keep the fonts: the wordmark stays `font-cherry` (Cherry Bomb One), body stays `font-sans`.
- Keep the penguin mascot as it is. No redraw, no recolour.
- Keep the existing headline "Belajar Tanpa Batasan.", both calls to action, the nav, and every section
  after the hero.
- HopeAI is for people with disabilities: reduced motion and screen-reader mode get a complete static
  composition with no pinned scroll; nothing essential lives only in the motion.
- No invented numbers.

## Journey

1. **Recognition**: a cosy room, a big window, the penguin reading on the sill. "This is where I study."
2. **Turn**: the curtains open and the camera walks to the glass. The world outside comes into focus.
3. **Release (peak)**: the camera goes through the window. The room falls away behind, the sky opens on
   every side, and a bunch of balloons carries the penguin past the visitor.
4. **Landing**: the flight slows over the city and the hills, the feature balloons drift by, and the
   world hands over to the feature section.

## Feeling curve

| Stage | Feeling | What on screen causes it |
|---|---|---|
| Room | Calm, safe | Warm wall, soft light, penguin reading, the headline at rest |
| Curtains | Curiosity | Curtains slide apart, light from outside brightens, the window grows |
| Through the glass | Wonder (**peak**) | The frame passes the edges of the screen; sky, clouds and city each move at their own depth; the penguin rises on balloons |
| Landing | Confidence | Movement slows, the world settles, the second line names what Hope.Ai is |

**The peak:** "I scrolled and walked straight through the window, and the penguin flew past me on balloons."
It lives in the Release stage and gets the largest share of the pinned scroll.

**Tell-someone sentence:** "It's the site where you climb out of your study room's window into the sky."

**Authored silence:** the first ~10% of the pinned scroll holds still on the room on purpose, so the move
through the window has something to change from. It is not dead scroll.

## Structure decision (Ruling)

Grammar: **Continuous world** for the hero flight only, followed by the existing sections in normal flow.
The pure grammar forbids any section boundary, but the user asked for "pengenalan fitur ... seperti
biasa" after the flight. The flight therefore owns one pinned stretch; at its end the sky colour settles
into the page background so the hand-over has no hard edge. Cost if wrong: the join between the flight and
the feature section may read as a seam; it is checked on screen.

## Revision, 21 Oct 2026

User review: wall changed to the Hope.Ai blue palette (wall `#cfe3fb`, primary `#0a47c2` trim, white
frame, violet accent curtains), window made squarer with four panes. The feature balloons were judged
weak (off-palette colours, a flat lined-up row, unclear that they are touchable). User chose to replace
them with **floating feature islands**: six islands rise from the horizon and spread to staggered depths,
each with its feature icon on a sign in the palette colours; hover or touch shows the description, click
opens the feature. Landing beat updated: "the flight slows over the islands of Hope.Ai".
