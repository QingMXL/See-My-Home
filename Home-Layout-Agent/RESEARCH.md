# Home Layout Agent research notes

Research date: 2026-08-28

## Reference products

### 建筑学长 — 户型图上色

The public workflow is primarily a visual transformation: upload a base plan, choose a style, and generate one or more colorized plans. A published walkthrough describes it as turning CAD linework into flat or 3D-styled color plans and explicitly notes that complex base drawings can cause errors requiring retries or local correction. This is useful as a reference for `layout-visualization`, but it is not evidence of a persistent spatial model or user-correctable household understanding.

- [Plan Colorizer](https://www.jianzhuxuezhang.com/ai/plan_colorizer)
- [Published workflow description](https://www.10100.com/article/71941349)

### 建筑学长 — 室内透视

This tool belongs to the same image-generation and architectural-rendering family. Its likely product value is fast visual communication, not verified reconstruction. The dynamic tool page could not be fully inspected without running a generation task, so no undocumented parameter or fidelity claim is assumed here.

- [Interior Perspective](https://www.jianzhuxuezhang.com/ai/interior_perspective)

### Product implication

See My Home should keep four layers separate:

1. Evidence from plans, photos, measurements, and user statements.
2. Canonical Home Model with provenance and uncertainty.
3. Diagnosis and opportunities derived from that model.
4. Visualizations generated from frozen confirmed geometry.

The reference products are closest to layer 4. Home Layout Agent’s differentiator is layers 1–3 and the controlled connection to layer 4.

## Existing Agent Skill found on GitHub

[`muapi-floor-plan-rendering`](https://github.com/SamurAIGPT/Generative-Media-Skills/blob/main/library/visual/floor-plan-rendering/SKILL.md) is a real Agent Skill that generates a 2D plan and then an isometric 3D rendering through MuAPI image-generation calls. The repository is MIT-licensed.

It is not sufficient as the core Home Layout capability because:

- It starts from a text description or base image, not a structured evidence ledger.
- It does not maintain room, opening, object, behavior, or constraint entities.
- It contains no provenance, confidence, correction, or revision contract.
- Its 3D result is generative imagery and may drift from source geometry.
- It requires a third-party API key and sends plan imagery to an external provider.

Decision: treat it as an optional visualization provider recipe only. Do not make it a dependency of version 0.1.

## Floor-plan parsing projects

| Project | Useful capability | Fit and limitation | License signal |
| --- | --- | --- | --- |
| [CubiCasa5K](https://github.com/CubiCasa/CubiCasa5k) | 5,000 annotated plans and 80+ object categories; multi-task floor-plan analysis | Strong baseline dataset/model, but old Python/PyTorch/CUDA stack and not an Agent Skill or hosted tool | Repository license file; verify dataset terms before commercial training |
| [Raster-to-Graph](https://github.com/SizheHu/Raster-to-Graph) | Raster plan to structural graph with semantics | Relevant output shape, but environment is old, the code is GPL-3.0, and training data access has separate restrictions | GPL-3.0 plus dataset terms |
| [RoomFormer](https://github.com/ywyue/RoomFormer) | Room polygons from top-down density maps, extendable to room types, doors, and windows | Better suited to 3D scans/RGB-D-derived density maps than ordinary uploaded plan screenshots | MIT |
| [Raster2Seq](https://github.com/Cornell-VAILab/Raster2Seq) | Raster plan to labeled polygon sequences; published checkpoints and inference scripts | Most promising future adapter for ordinary raster plans, but still a GPU research stack rather than a ZooClaw Skill | MIT |
| [Floor-Plan-Recognition](https://github.com/RasterScan/Floor-Plan-Recognition) | Dockerized HTTP endpoints for raster-to-vector recognition | Convenient proof-of-concept API, but the repository describes machine activation/lifetime licensing and does not expose a full auditable implementation | Commercial/licensing review required |
| [FloorplanToBlender3d](https://github.com/grebtsew/FloorplanToBlender3d) | Classical OpenCV detection of rooms, walls, doors, and windows; 3D conversion | Useful for experiments and explainable preprocessing; brittle across drawing conventions | GPL-3.0 |

## Recommended technical path

### Version 0.1 — Builder-only, no custom backend

Use ZooClaw’s multimodal model for evidence extraction and enforce correctness through the schema, provenance, confidence, revisioning, focused user confirmation, and visual fidelity checks in this pack. Keep all metric geometry unknown unless the user provides a usable scale reference.

This version can produce a reliable qualitative Home Model and layout diagnosis. It should not claim CAD-grade vectorization.

### Version 0.2 — Optional vectorization tool

Add a provider-neutral tool adapter with this minimum response:

```json
{
  "source_id": "src_plan_01",
  "coordinate_space": "normalized_0_1",
  "room_polygons": [],
  "wall_segments": [],
  "openings": [],
  "semantic_labels": [],
  "model_version": "",
  "confidence": 0.0
}
```

Evaluate Raster2Seq first for raster uploads and RoomFormer only for scan-derived input. Keep tool output at `observed` or `inferred`; never promote it to `user_confirmed` automatically.

### Version 0.3 — Controlled visualization provider

Connect a chosen image-editing provider only after it can accept frozen-geometry constraints and the product has a privacy/consent path. Evaluate with geometry-preservation tests rather than visual attractiveness alone.

## Research conclusion

No discovered open-source Agent Skill completes the full See My Home job. One existing Skill covers attractive 2D/3D rendering, and several research repositories cover geometric parsing. The correct product is therefore an orchestration layer built around a proprietary Home Model contract, with parsing and visualization kept as replaceable tools.

