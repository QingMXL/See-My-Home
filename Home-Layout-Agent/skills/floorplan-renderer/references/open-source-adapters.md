# Optional open-source adapters

No global ZooWork catalog skill currently provides guaranteed source-locked floor-plan editing. The base implementation uses ZooWork's injected image-generation capability for the primary presentation image and retains the application renderer as its deterministic fallback. Neither path needs an extra API key.

Future local adapters may reuse ideas from:

- Aedifex (MIT): React/Three.js floor-plan editor with walls, doors, windows, zones, furniture, collision and clamping. Its deterministic editor can be used without its optional AI assistant.
- openPlan3D (MIT): SvelteKit/Three.js 2D/3D editor with snapping and a large furniture catalog.
- CubiCasa5K / RoomFormer: research-grade floor-plan parsing references; they require local model/runtime integration and are not drop-in ZooWork Skills.

Do not add one of these repositories as a production dependency without a separate license, bundle-size, security, and geometry-fidelity review.
