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

Generate one landscape raster using the confirmed product render as the sole image reference. The image contains exactly three panels from left to right: front elevation, side elevation, and top plan. All three panels show the same table with the same component count, component placement, silhouette, and recognizable proportions.

Use crisp dark monochrome lines on a warm-white background. Keep each panel isolated and fully visible. Do not add a perspective view, room scene, materials, shadows, props, extra panels, labels, dimension numbers, title blocks, logos, or watermarks. Echo the confirmed design specification unchanged in the structured response.

Image generation is not dimensional proof. Pass/fail both modes on recognizable consistency with the concept specification. The product presents the exact confirmed millimetre values beside the concept orthographic image and does not claim fabrication readiness.
