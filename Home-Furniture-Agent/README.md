# Home Furniture Agent integration slot

This directory is reserved for the independently developed Home Furniture Agent.
It is intentionally not presented as a working Agent yet: the current website still
uses a browser-only demo for furniture generation.

When the real Agent source is merged, keep all of its Runtime, Skills, schemas,
tests, provisioning code, and documentation inside this directory. Its public
boundary must be `home-furniture-v1`; the website must reach it only through
`/api/home-furniture/*` and must never import its internal implementation.

See [`docs/AGENT-INTEGRATION.md`](../docs/AGENT-INTEGRATION.md) for the release and
compatibility rules.
