# Home Furniture demo assets

Place the three public demo images in this directory with these exact names:

- `source-sketch.png` — the hand-drawn furniture sketch shown in Step 1.
- `concept-render.png` — the finished furniture render revealed in Step 2.
- `orthographic-views.png` — the dimensioned front, side, and top-view sheet revealed in Step 3.

Use PNG files in sRGB. Keep the render and orthographic sheet visually consistent with the sketch and with each other. The orthographic image should be a pure-white, black-line technical drawing with readable millimetre dimensions and a true, non-perspective top view.

The demo must still advance through the normal three-step interface. These bundled images are revealed at their corresponding steps instead of skipping directly to the final result or calling the production image model.

The current bundled example is a `1800 × 900 × 750 mm` dining table with a `40 mm` freeform black-ash top, two curved slab supports, and a clear-glass lower shelf. Keep the hard-coded demo specification in `src/data/furnitureDemo.ts` synchronized if any of the images are replaced.

These files are bundled with the public website. Do not place private customer images here.
