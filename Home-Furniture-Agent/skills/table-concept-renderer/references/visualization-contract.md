# Furniture visualization contract

The request has two mutually exclusive modes. The historical `request.table_type` key identifies the exact supported furniture item.

## Concept render

Generate one isolated full-product view on a quiet neutral studio background. When a sketch is present, preserve its viewing angle, elevation, visible faces, framing, topology, component count, and placement according to its source weight. Use a three-quarter view only when no sketch exists or the sketch itself uses that view.

Inspect each supplied source once before generation. Materialize and publish the concept raster without a second image inspection. Express reference weighting through the prompt and specification only.

Preserve the requested item family and intended use, exact stated overall dimensions, principal form and edge detail, support/base/mount, primary and secondary materials, finish, and all specified major components. In particular:

- chairs: seat, back, arms, frame/supports, upholstery boundaries, swivel/cantilever/footrest features;
- sofas: module arrangement and handedness, cushion count, arms, upholstery seams, frame, chaise/bed feature, legs or plinth;
- lamps: shade/diffuser, light-head count, luminous element placement, stem or arms, base/canopy/wall mount, requested switch or cord;
- tables: top, supports, apron, stretchers, storage, hardware.

Avoid extra or missing parts, impossible intersections, floating components, visibly implausible supports, companion furniture, décor, people, room staging, text, dimensions, labels, logos, watermarks, or a camera that crops the product. Do not copy a branded product wholesale.

## Orthographic layer

Each turn generates one raster from the confirmed product render as the sole image reference: front elevation, side elevation, or top plan. Show the complete requested item with confirmed component count, placement, silhouette, and recognizable proportions. Do not redesign or simplify it. Preserve width-to-height, depth-to-height, or width-to-depth from `confirmed_design_spec.dimensions_mm`.

Use clean black-and-white technical linework on pure white. Visible outer silhouette is noticeably heavier than internal component edges; unavoidable construction detail is thinner. Center the object with clear margins. Do not add another view, panel border, perspective convergence, room scene, materials, tonal fills, shading, shadows, props, generated labels, dimension numbers, title blocks, logos, or watermarks. Echo the confirmed specification unchanged.

For a lamp side elevation, keep the true confirmed depth-to-height proportion even when the product is shallow and the silhouette is narrow. Rotational symmetry may make front and side elevations nearly identical. These are valid outcomes, not publication failures, provided the complete shade or diffuser, visible heads, stem or arms, and base, canopy, or wall mount are readable. Use roughly 70-80% of the canvas height with dark, solid outer contours; do not artificially widen the lamp. A wall sconce must show its real projection away from the mounting plane.

When the request identifies an automatic orthographic retry, create a fresh raster rather than repeating the rejected layout. Increase useful canvas occupancy, strengthen the visible contour, preserve internal component edges, and verify every extremity and required component before publication.

For `orthographic_view=top`, output a strict plan, not a bird's-eye or elevated view. Center the camera directly above the furniture, set the optical axis perpendicular to the floor, and keep the principal horizontal plane parallel to the image plane. Use parallel projection with no convergence, skew, foreshortening, adjacent face, or underside. Draw only genuinely visible surfaces. Opaque upper parts hide lower parts: table tops hide underframes; seating cushions, arms, and backs occlude according to their real overlap; lamp shades, diffusers, canopies, and bases occlude parts below according to height. Omit hidden parts rather than drawing solid or dashed hidden lines. Reject invented projections.

After inspection, set `qa.orthographic_projection_correct` and `qa.orthographic_visible_surfaces_correct`; both must be true before publication. Perspective, adjacent-face leakage, hidden structure, unsupported component projection, or disagreement with the render is non-publishable.

The application combines three published rasters into one 3840 × 2160 shop-drawing sheet, normalizes them to one confirmed-dimension scale, and adds deterministic width/height, depth/height, and width/depth annotations. It adds confirmed `design_spec.top.thickness_mm` to the side view only for table types. Image generation is not dimensional proof. This product does not claim fabrication readiness.
