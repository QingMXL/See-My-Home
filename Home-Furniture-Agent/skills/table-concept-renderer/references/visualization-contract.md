# Table visualization contract

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

Image generation is not dimensional proof. Pass/fail the render on recognizable consistency with the concept specification; the application remains responsible for exact line-view geometry and labels.
