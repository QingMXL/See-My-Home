# Placement contract

Every placement must have a stable ID, `space_ref`, canonical object kind, normalized center `x/y`, normalized `width/height`, and rotation degrees. Coordinates are in the same `image_normalized_0_1` source space as the confirmed room polygon.

A valid placement stays inside its referenced polygon after clipping and does not change source geometry. Baseline sets:

- Living/family room: sofa, television or media wall, media console; coffee table only when circulation remains.
- Kitchen: cabinetry/counter, sink, cooktop, refrigerator; island only when supported.
- Bedroom: bed and clothing storage; desk/play surface only when supported or requested.
- Bathroom: one toilet, one sink/vanity, one shower zone; tub only when supported or requested.
- Walk-in closet: wardrobe storage and shelving.
- Home office: desk, task chair, bookshelf/file storage.
- Balcony: weather-appropriate finish; seating only when depth supports access.

User overrides always supersede these defaults. Apply them before resolving `default_object_counts`, then use the resolved count as the exact planning target. Unless explicitly changed, plan exactly one bed per bedroom; one toilet, one sink/vanity, and one shower/tub zone per full bathroom; and one sink, one cooktop, and one refrigerator per kitchen. Repeated allowed objects require distinct stable placement IDs. Never create a placement inside an `excluded_region`.
