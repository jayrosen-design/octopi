# Jay Rosen Studios × OctoPi — Studio Agent Framework (prototype)

**Status:** Reviewable experimental feature branch, not a deployed business automation system.

This extends [OctoPi](https://github.com/jayrosen-design/octopi) with **Studio Pods**. It preserves the original four-agent research reef and its Garden, Projects, Mold an Agent and Deep Research functionality. The new `studios.html` page shows **seven pods** (shared operations and six studios) with **35 clay octopus roles**. The role registry is in `studio-teams.js` and the dashboard/controller in `studios.js`.

## Run locally

```sh
git checkout feature/studio-agent-teams
python server.py
# http://127.0.0.1:8765/studios.html
```

WebGPU is used when available, with the existing Three.js WebGL 2 fallback. The new page instantiates **five** of the 35 clay agents at a time, using the existing procedural `clay-agent.js` and its props. Each pod can be selected, its agent roles inspected, and specialist mission outputs displayed. Only one pod runs at a time.

## Studio and agent structure

- **00 Shared Operations:** Executive Orchestrator, Finance & Bookkeeping, Marketing & Brand, Contracts & IP Review, Project Management.
- **01 Games & Interactive Entertainment:** Game Studio Director, Game Design, Physics & Systems, 3D Art & Assets, Publishing & Platform.
- **02 Simulation & Visualization:** Simulation Director, Data Modeling, GIS & Mapping, Visualization, Scenario Analysis.
- **03 Public Art & Holograms:** Public Art Director, Concept Design, Fabrication Coordination, Installation Planning, Interactive Media.
- **04 Art, Prints & Creative Works:** Creative Products Director, Fine Art, Astrophotography, Print & Merchandise, Booth & Festival Sales.
- **05 Education & Publishing:** Education Director, Curriculum, Book & Writing, Workshop Planning, Community Outreach.
- **06 Software, AI & Consulting:** Consulting Director, Software Architecture, Web Product, AI Solutions, Client Success.

**Human oversight:** Jay directs creative vision and technology; Jessica oversees accounting/operations and art education. Any client outreach, contractual commitments, vendor orders, actual bookkeeping entries, release decisions, and spending require explicit human approval. These agents produce plans, not legal, engineering, tax, or financial signoff.

## Workflow

1. Open **Studio Pods** from the navigation and select a pod.
2. Inspect the five animated procedural clay agents and their distinct tool props.
3. Type a mission / project brief. Choose an accessible NaviGator model ID; the existing research desk can load allowed model IDs.
4. With the original Python bridge running and a valid NaviGator key present (server environment or the research desk’s opt-in local key storage), select **Run team mission**.
5. The director proposes a plan, four specialists each provide a perspective sequentially, and the director synthesizes. The UI shows incremental results, status, cancellation and a locally saved mission history.
6. Export results as a standalone JSON report; use **Research with existing OctoPi crew** to send a relevant question into the existing sourced Deep Research pipeline.

A completed run costs up to **six chat model calls**. This studio pipeline does *not* itself search the web, access business systems, browse files, run code, send emails, manage contracts, or make purchases. Tool props are visual and clickable clay models, **not integrations or delegated executors**. Model-generated statements are unverified unless supported by evidence from another workflow.

## Security, data and limitations

- Roles are authored in code; the 35 agents are **not** 35 continuously running model processes.
- Missions are saved in browser `localStorage` under `octopi-studio-missions-v1` (up to 20 records). Export JSON explicitly to retain a portable copy.
- If the original OctoPi researcher was configured with **opt-in saved provider keys**, the Studio Pods workflow can reuse that key. Otherwise set `UF_NAVIGATOR_API_KEY` for the existing local bridge. No credentials are embedded in these additions.
- Prompts instruct agents not to claim external actions and to treat mission content and prior responses as untrusted task data; this is not an enforceable security sandbox.
- This is a functional **local-first prototype**. It has not been browser-tested in the connected GitHub runtime and is not production-ready for sensitive client data.
- The Studio Pods page is **separate** from the existing project bundle import/export; studio history currently has its own JSON export. Future work could integrate this state with `project-files.js` and Google Drive.
- Existing custom Mold-an-Agent agents still use their separate four-agent store. The 35 studio roster definitions are not counted against that existing limit and are not authored via the workshop.
- Public art contracts and UF-related projects still require applicable rights, conflict and export-control review.

## Suggested next development steps

1. Add Playwright smoke tests for navigation, scene fallback, role selection, mission cancellation, and local-state migration.
2. Integrate project bundles and shared evidence collections with studio missions.
3. Add explicit per-tool permissions and a human-approval queue before real business integrations (GitHub, accounting, email, vendor systems).
4. Add richer fabrication / software / game props to `fidelity.js`, extending the existing nine procedural prop types.
5. Add concurrency/budgets and traceable mission telemetry only after securing credentials and tenant isolation.

**Changes introduced by this branch:** `studios.html`, `studios.css`, `studios.js`, `studio-teams.js`, `STUDIOS.md`; a single additional navigation link in `site-navigation.js`.
