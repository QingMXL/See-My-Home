# Agent integration and release policy

See My Home has three independently developed Agent domains:

| Domain | Owned source | UI/API boundary | Current status |
| --- | --- | --- | --- |
| Home Layout | `Home-Layout-Agent/` | `/api/home-layout/*`, `home-layout-v2` | Connected |
| Home Style | `Home-Style-Agent/` | `/api/home-style/*`, `home-style-v1` | Connected |
| Home Furniture | `Home-Furniture-Agent/` | `/api/home-furniture/*`, `home-furniture-v1` | Connected |

## Ownership boundary

An Agent change owns only its Agent directory and, when its public contract changes,
its matching API adapter and UI client. Agent code must not import another Agent.
The website must not call ZooWork directly and must not depend on an Agent's persona,
Skill files, provisioning logic, or session implementation.

Shared Blob storage is infrastructure, not shared Agent state. Every domain uses a
separate pathname prefix (`uploads/layout`, `uploads/style`, and
`uploads/furniture`). ZooWork credentials remain server-side.

## Preventing version drift

`agent-release.json` is the compatibility lock for the website. It records the exact
package version, Runtime contract, API namespace, and Agent-ID environment variable
for all three domains. Individual Agent branches do not update the release-set name.

Use this release flow:

1. Develop and test each Agent independently in its own directory.
2. Create a new immutable ZooWork Agent/Skill version; do not silently redefine the
   Agent ID used by Production.
3. Update the matching package version and contract tests.
4. On an integration branch, select one compatible version of all three Agents and
   update `agent-release.json` once.
5. Run `pnpm check`, `pnpm test`, and `pnpm build`.
6. Deploy that exact Git commit to Preview, then promote the same commit and Agent-ID
   set to Production.

The Vercel environment variables are deliberately separate:

- `ZOOWORK_AGENT_ID`
- `ZOOWORK_STYLE_AGENT_ID`
- `ZOOWORK_FURNITURE_AGENT_ID`
- `ZOOWORK_API_KEY` (shared account credential, server-side only)

## Concurrent work

Use one branch per Agent, for example `agent/layout-v2.4`, `agent/style-v1.3`, and
`agent/furniture-v1.0`. Avoid editing the root release manifest from those branches.
The integration branch is responsible for resolving package versions, running the
full compatibility suite, and advancing the release set.
