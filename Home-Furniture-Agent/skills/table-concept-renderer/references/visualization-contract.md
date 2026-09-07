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

Generate one landscape raster using the confirmed product render as the sole image reference. The image contains exactly three equal-width panels from left to right: front elevation, side elevation, and top plan. All three panels show the same table with the same component count, component placement, silhouette, and recognizable proportions. Do not redesign or simplify drawers, shelves, supports, hardware, or curved structural details. Preserve recognizable width-to-height, depth-to-height, and width-to-depth ratios from `confirmed_design_spec.dimensions_mm`.

Use crisp solid-black lines on a pure white background. Keep each panel isolated and fully visible, with clear margins around every view for a separate application-rendered annotation band. Do not add a perspective view, room scene, materials, tonal fills, shading, shadows, props, extra panels, generated labels, dimension numbers, title blocks, logos, or watermarks. Echo the confirmed design specification unchanged in the structured response.

Image generation is not dimensional proof. Pass/fail both modes on recognizable consistency with the concept specification. After the Agent publishes the line-art raster, the application applies the exact confirmed millimetre values as deterministic annotations and exports one final PNG. The product does not claim fabrication readiness.
