# Table visualization contract

The request has two mutually exclusive modes.

## Concept render

Generate one isolated product view on a quiet neutral studio background. When a sketch is present, preserve its camera viewpoint: viewing angle, elevation, visible faces, and framing should remain recognizably aligned with the sketch according to its source weight. Use a three-quarter view only when there is no sketch or the sketch itself uses that view. The complete table must be visible, with no room staging that hides its silhouette.

When both visual references exist, the output should be recognizably closer to the image with the higher `source_priority` value. Express this balance through the natural-language design prompt and validated specification only; do not invent numeric image-weight or control-strength arguments that the current image tool schema does not expose.

## Preserve

- table family and intended use
- exact overall width, depth, and height stated in the prompt
- top shape and edge profile
- number, placement, and broad geometry of supports
- apron, stretcher, shelf, drawer, cable opening, and other specified major components
- primary and secondary material assignments
- sketch camera viewpoint and framing when a sketch is present

## Avoid

- extra or missing legs, pedestals, drawers, shelves, or nested pieces
- impossible intersections, floating parts, visibly unstable support arrangements
- chairs, stools, lamps, décor, tableware, people, text, dimensions, labels, logos, or watermarks
- perspective that crops the table or prevents its main construction from being read
- copying a branded reference product wholesale

## Orthographic sheet

Each orthographic turn generates one raster using the confirmed product render as the sole image reference. Read `request.orthographic_view` and create exactly that one view: front elevation, side elevation, or top plan. Show the complete table with the confirmed component count, placement, silhouette, and recognizable proportions. Do not redesign or simplify drawers, shelves, supports, hardware, or curved structural details. Preserve the relevant width-to-height, depth-to-height, or width-to-depth ratio from `confirmed_design_spec.dimensions_mm`.

Use clean, uniform black-and-white technical linework on a pure white background. The furniture's visible outer silhouette must be noticeably heavier than internal component edges; keep internal edges medium weight and any unavoidable construction detail distinctly thinner. Keep the single object centered and fully visible with clear margins on every side. Do not add another view, a panel border, perspective convergence, room scene, materials, tonal fills, shading, shadows, props, generated labels, dimension numbers, title blocks, logos, or watermarks. Echo the confirmed design specification unchanged in the structured response.

The application starts three independent orthographic turns and combines the three published rasters into one 3840 × 2160 shop-drawing sheet. It normalizes the geometry layers to one confirmed-dimension scale and adds deterministic annotations from `confirmed_design_spec`: front width and height, side depth and height plus top thickness, and top width and depth. The final layout uses a large front elevation at upper left, a side elevation at upper right, and a top view below, with a pure white background, fine border, thin extension and dimension lines, arrowheads, sans-serif engineering labels, and every numeric value followed by `mm`. Image generation is not dimensional proof. Pass or fail each geometry layer on the presence of one complete requested view, recognizable component consistency, adequate whitespace, the required line hierarchy, and absence of extra views, shading, and material texture. Report minor raster ratio drift as a warning; cropping, materially different furniture, missing major components, or multiple views fail. The product does not claim fabrication readiness.
