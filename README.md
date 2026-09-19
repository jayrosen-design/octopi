# Octopi AI · Research reef

## Start

Run `python server.py` from this folder, then open http://127.0.0.1:8765/.
The included server is required for real search and model requests. Python 3 needs no additional packages. Internet access is needed for providers, pinned Three.js modules, and fonts.

## Home modes

Deep Research, Experts, and Documents sit inside the homepage search box, not the top bar. Switching tabs changes the heading, prompt, chips, and action:

- **Deep Research** — ask a sourced question, then **Start research**. The plan still requires approval before search.
- **Experts** — ask one specialist or a panel of 2 or 4, then **Ask the panel**. Chips become Researcher, School Teacher, Instructional Designer, and Education Leader.
- **Documents** — paste a draft or brief in the taller field, choose Guided Co-Write, Parallel Review, Pipeline, or Roundtable, optionally **Attach a draft** (`.txt` or `.md`), then **Open the editor**. Chips become the editorial crew.

Each mode keeps its own typed text while you switch tabs. Start stores the question plus the chosen mode, panel size, or editorial method in this tab’s session memory.

## Real research

Choose Deep Research in the search box, enter your question, and start. Or open `/panel.html?mode=research` directly.

1. Open **Connect NaviGator**. Enter your personal NaviGator key, load accessible models, and choose a chat model. Add your Tavily key for search.
2. Enter a question and choose **Create research plan**. This requests a plan from your model; it does not search yet.
3. Edit the plan and up to three search queries. Choose **Approve plan & search**.
4. Watch actual request progress, source links, and the animated reef. Duplicate URLs are combined. The top three pages are requested through Tavily Extract; unavailable pages fall back to snippets.
5. Four research perspectives review the evidence. The model synthesizes a report with numbered references. Read, edit, copy, or export it as Markdown.

No keys are included or issued by this app. Keys entered in connection settings stay in page memory until reload. Alternatively, set UF_NAVIGATOR_API_KEY and TAVILY_API_KEY in the server environment before starting. Credentials travel through the local bridge to their corresponding provider. Research questions and evidence are sent to those services; provider credits may be used.

A research run uses six model calls including planning, up to three search requests, and one extraction request. The separate Ask the Panel page has an explicitly labeled demo and a live four-round panel mode using 17 model requests. Demo results are not live research.

The animated mini-browser represents activity; it is not a remote browser recording. The activity log and source cards report provider responses. Errors do not fall back to fabricated reports. Stop cancels the browser's wait and subsequent steps; requests already sent upstream may still finish and consume credits.

Reports and sources are saved locally in this browser, with up to twelve collections. The reef's data bubbles can resume those collections. References are bounded to collected sources; this is not independent fact checking or a guarantee that every claim is supported. Review original sources before relying on a report.

## Reef and clay workshop

Drag to orbit; wheel or pinch to zoom. Select an octopus or a research bubble. The front research crew and each Garden pod face their teammates, with a small thinking glance, while they keep bobbing, pulsing, and moving their arms. Selecting a reef agent turns that octopus toward you. Agents swim while the panel works and evidence bubbles collect around them. My octopi opens the selection grid; Mold an octopus opens the clay workshop. Saved agents and edited research stay on this device.

Music starts after a browser-permitted interaction; searching switches to the second supplied track. Use the music control to mute it.

## Verification

Checked desktop/mobile research rendering and the missing-key connection flow. Automated tests exercised plan approval, three search queries, source deduplication, extraction, report generation, citation bounds, persistence, and provider failure with fixture responses. Six local bridge tests checked routing, missing keys, origin rejection, extraction, chat responses, and redacted provider errors.

No live provider run was performed because no working NaviGator or Tavily credentials were supplied. The local server is intended for a single-user preview, not a hosted multi-user service.

## Scene layout

Octopi chat lives in the right sidebar, with independent scrolling. Collected sources are collapsed below the reef. Bigger view fills the app window; Fullscreen uses the browser fullscreen feature. The floating clay search panel can be collapsed. Exit bigger view or press Escape to return; Read the report returns to the completed report. On narrow screens, chat sits below the reef.


## Octopi Garden

Open garden.html or choose Octopi Garden from the reef or panel. Four demo teams occupy different coral gardens. Teammates face the pod conversation, with a thinking glance, instead of only swimming away from the group. Visit a team using its destination button or floating bubble; orbit, pan, zoom, or travel with WASD / arrow keys. Team conversations are prefilled illustrations, with rotating individual and group speech bubbles. Select Knowledge graph or a 3D node to read retained notes and their origins. Combine knowledge adds nonduplicate notes to another team's bubble and saves locally. The graph illustrates knowledge relationships; it does not connect to a vector database or calculate embeddings. Memory Meadow can display up to three locally saved live research records, distinguished from demo notes.

The panel's search card has an explicit Minimize / Open search control. Each arriving panel reply updates its octopus's own bubble and the shared clay chat. Starting music in an updated Octopi tab pauses other updated Octopi players across tabs; click Play here to move playback back. This cannot control unrelated websites or apps. Reload older Octopi tabs once to activate the shared audio coordination.


### Water sounds, clay workshop, and garden surfaces
- Each rendered octopus has procedural underwater movement sounds with a distinct pitch, stereo placement, and distance attenuation. Speech/data arrivals and source selections trigger bubble tones. A six-voice limit keeps crowds quiet.
- Water sounds can be toggled independently beside the music button. The main sound toggle and cross-tab handoff stop all effects; embedded research scenes follow their parent panel. Browser interaction may be needed to start audio.
- Workshop startup is repaired. New clay creates a fresh model; saving provides a link that selects the named agent in the reef. Every arm has a task and an attached tool, including sample vials, archive cylinders, chart tablets, pencils, books, scrolls, and globes.
- Garden uses WebGPURenderer with its supported fallback, soft environment reflections, shadows, and procedural clay textures. Demo graphs expose official reference URLs and citations; their conversations and relationships remain illustrative.
- Verified: JavaScript parsing, audio ownership/voice-limit tests, workshop initial render and saved-agent return, water-sound toggle, and citation selection by keyboard.


Garden resources preload in the background from the homepage, panel, and workshop using two low-priority downloads at a time. Embedded reef frames skip duplicate preloads; data-saving connections wait for interest in the Garden link. No hidden scene or audio player is started. Procedural clay textures reuse computed pixel data with independent texture tiling.


### Movable clay, mobile pods, and Kokoro
- Drag an octopus, held prop, pebble or coral to lift it. Empty-water drags orbit the camera. Pickup pinches the surface, release applies damped gravity and a soft floor bounce. Objects settle at their new positions; this is lightweight artistic physics, not a full rigid/soft-body solver.
- Garden controls include a keyboard/touch alternative: Move a collaborator → choose an octopus and destination pod. Landing near a different pod appends an authored visitor/host introduction and knowledge-graph note. These are demo conversations, not model-generated claims. Garden placement and these introductions currently last for the page session.
- Workshop tools trigger body/eye reactions and spring settling; edited arms carry their tools with them.
- Garden now includes sculpted ocean walls, a shelf descending into a dark trench, and twinkling underwater lights. Mobile controls collapse and pod conversations open in a half-height bottom drawer.
- Speech uses NaviGator POST /v1/audio/speech with model kokoro, af_heart by default, and MP3 output, through the local /api/speech bridge. Use Speech → enter a NaviGator key, or reuse the panel connection / server environment key. Keys remain in memory. Listen buttons read individual messages; optional auto-read follows the selected pod. Stop speech and cross-tab music handoff cancel pending requests and playback. No browser-generated voice fallback is used.
- Verified: real-browser octopus/rock pickup, settling and cross-pod introduction, workshop Pull and Undo availability, mobile 390×844 layout and controls, module parsing, eight backend fixture tests including Kokoro binary response and validation, audio handoff tests, and preload tests. Live Kokoro playback requires a user key and has not been verified with credentials.
- Official endpoint reference: https://docs.ai.it.ufl.edu/docs/navigator_toolkit/capabilities/text_to_speech/


## Clickable clay tools
Octopi carry a varied set of two to four larger tools on alternating arms, leaving free swimming arms. Click a tool or its holding arm to animate it. Held tools remain attached and cannot be picked up separately; drag the octopus body to carry them together. Tools animate independently of swimming and return to their grip pose. The workshop supports tool clicks in Orbit mode. These are visual tool demonstrations, not automatic API research requests. Arms use independent traveling bends, lateral curls and reaching gestures; the suckers and held tools follow the same deformed grip. Swimming includes mantle pulses. Grouped octopi keep those idle motions while facing their crew or pod, rather than only following a travel heading.

Shared navigation now includes Home, Mold an Agent, and About. The Garden supports taking control of an octopus with WASD/arrows and releasing with Escape. The workshop uses WebGPU with a compatible fallback. The Search page no longer has the Bigger View control.
