# Diagnosis contract

The Runtime response `diagnosis` object contains:

- `based_on_model_revision`: the exact revision analyzed.
- `finding_refs`: IDs of findings already present in the returned/current Home Model.
- `opportunity_refs`: IDs of related opportunities.
- `summary`: a concise locale-appropriate explanation.
- `assessment_items`: zero to five concise design observations. Each item has `id`, one allowed design category, `impact`, bilingual `title` and `statement` objects containing both `en-US` and `zh-CN`, and `affects_refs`.

Allowed assessment categories are circulation, functional gap, adjacency, privacy, daylight, storage demand, activity conflict, and underused space. Do not put absent furniture, fixtures, appliances, sanitary equipment, broken typography, or any other render defect in this list.

Each referenced problem in the Home Model contains type, `finding` or `hypothesis`, statement, affected entities, evidence references, impact, epistemic state, confidence, and status.

Each referenced opportunity contains responding problem IDs, applicable constraint IDs, intervention level, reversibility, professional-verification requirement, and status.

Prioritize the three most important supported observations. If the model lacks sufficient evidence, return `needs_confirmation`, no unsupported findings, and up to three questions.
