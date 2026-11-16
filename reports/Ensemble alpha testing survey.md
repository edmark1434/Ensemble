# Ship a stats-ready Ensemble alpha survey

**Use a layered alpha instrument, not a single mega-form.** Pair short scripted tasks with a **~5-minute weekly survey** built from **UMUX-Lite** (two items), a **six-row feature matrix on one shared 5-point scale**, binary bug/blocker rates, and optional open text; run **SEQ (1–7)** only immediately after each scripted task; defer **Sean Ellis PMF** until testers have used the core value at least twice in two weeks; **defer NPS** until late beta when loyalty trends matter more than diagnosis. That stack matches MeasuringU’s task-level vs study-level guidance and keeps length near the **~5-minute / 8–12 closed-item** abandonment threshold that predicts completion better than any other design choice ([MeasuringU: Why Collect Task- and Study-Level Metrics?](https://measuringu.com/why-collect-task-and-study-metrics/); [MeasuringU: How Long Is the Typical Online Study?](https://measuringu.com/online-study-time/); [SurveyMonkey: How Long Should A Survey Be?](https://www.surveymonkey.com/curiosity/survey_completion_times/)). Ensemble already captures onboarding intent, a global 1–5 platform rating, ticket CSAT, and peer/asset/team stars—but **has no dedicated NPS/SUS/alpha questionnaire**—so this instrument fills the product-level, comparable, statistics-ready gap without replacing in-product stars. Target cohorts of **~5–30** testers; report means and proportions **with confidence intervals**, and treat feature-to-feature gaps as decision signals only when they are large.

## Instruments, length, and when to defer NPS

Alpha feedback works best as three layers that reuse the same scales so week-over-week and feature-vs-feature comparisons stay valid. **Layer A** is optional 1–3 item in-product pulses after critical actions (e.g., first export, first contract fund). **Layer B**—the primary deliverable below—is a **weekly / post-session survey of about 10–14 closed items plus 1–2 opens (~5 minutes)**: screener once per cohort, then usage filters, the six-feature satisfaction matrix, UMUX-Lite, bug/friction block, and optional open text. **Layer C** is moderated or unmoderated task sessions: binary completion + **SEQ** after each task, then the Layer B study metrics at the end ([MeasuringU: Guide to Study-Based UX Metrics](https://measuringu.com/guide-to-study-based-ux-metrics/); [MeasuringU: 10 Things To Know About the SEQ](https://measuringu.com/seq10/)).

| Instrument | Items / scale | When to use | Why for Ensemble alpha |
|---|---|---|---|
| **SEQ** | 1 item, **1–7** Very difficult → Very easy | Immediately after each scripted task | Diagnostic; correlates ~0.5 with completion/time; historical mean ≈ **5.5** ([MeasuringU SEQ](https://measuringu.com/seq10/)) |
| **UMUX-Lite / UX-Lite** | 2 items, **1–5** agree | Once per weekly survey / session end | Short SUS analog (α ≈ .82–.86; r with SUS ≈ .81–.83); fits tight alpha forms ([MeasuringU: UMUX-Lite](https://measuringu.com/umux-lite/); [CHI UMUX-LITE](https://dl.acm.org/doi/10.1145/2470654.2481287)) |
| **Feature matrix** | 6 rows × shared **1–5** satisfaction + N/A | Every weekly pulse | Comparable means across Editor, Jobs/Gigs, Forums, Assets, Teams, Contracts ([Maze Matrix](https://help.maze.co/articles/1713486615-collect-multi-dimensional-feedback-with-the-matrix-block); [Formware feature report card](https://formware.io/templates/software-customer-satisfaction-survey-template/)) |
| **Bug / friction** | Binary + categorical failure mode + soft severity | Every pulse | Yields % encounter rates with Adjusted Wald CIs; separates “broken” from “hard” ([Userpilot](https://userpilot.com/blog/beta-testing-feedback-form-template-best-practices-and-examples/); [MeasuringU small-n](https://measuringu.com/small-n/)) |
| **Sean Ellis PMF** | 1 item, 3 disappointment levels | **Week 2+**, qualified users only | Benchmark % Very disappointed vs ~**40%** heuristic; invalid on day-one ([Learning Loop PMF](https://learningloop.io/plays/product-market-fit-survey); [Precoil](https://www.precoil.com/articles/net-promoter-score-or-product-market-fit-survey)) |
| **SUS** | 10 items, 1–5 | Optional quarterly benchmark only | Industry norms exist, but 10 items crowd out feature/bug items in a 5-minute form ([MeasuringU SUS](https://measuringu.com/sus/)) |
| **NPS (0–10)** | 1 item | **Defer to late beta / GA trend** | Loyalty/WOM metric; weak for interface diagnosis; pair later with UMUX-Lite, never alone ([MeasuringU study metrics](https://measuringu.com/guide-to-study-based-ux-metrics/); [Zonka beta surveys](https://www.zonkafeedback.com/blog/beta-testing-survey)) |
| **CES 2.0** | Optional 1–7 agreement | After support/dispute “handle my issue” | Post-interaction effort, not whole-product usability ([Questionstar CES](https://questionstar.com/blog/customer-effort-score-ces/)) |

**Survey length rule:** keep the weekly instrument under **~10 minutes** (ideal **~5**). Prefer multiple short surveys over one long form. If SUS is required for an external benchmark, run it as a separate pulse rather than stuffing it into the feature matrix survey ([MeasuringU Survey Design](https://measuringu.com/wp-content/uploads/2020/11/SurveyDesign_Hulu2020.pdf)).

**Primary scale family (do not mix within comparable rows):** feature satisfaction and UMUX-Lite on **5-point fully labeled** Likert; SEQ on **7-point** end-labeled semantic differential; binary Yes/No for completion and blockers; **N/A / Did not use** wherever relevance varies ([NN/g: Rating Scales in UX Research](https://www.nngroup.com/articles/rating-scales/); [MeasuringU: 5 vs 7 points](https://measuringu.com/scale-points/)).

## Six Ensemble surfaces testers must exercise

Ensemble is a collaborative creative platform (React member site + Express API + optional DesignCombo-based video editor). Credits power marketplace purchases, job/gig fees, escrow, and plan gates. The six survey rows map to real routes and flows in the codebase; alpha scripts should hit **must-exercise** paths first and treat advanced paths as optional.

| Area | What it is in Ensemble | Must-try tester flows | Alpha caveats |
|---|---|---|---|
| **1. Cloud Real-Time Collaborative Video Editor** | Projects list → handoff token → `video-editor` at `/editor/:id`; collab, uploads, comments, market assets, render/export | Create personal project → open editor → invite/share → upload media → timeline edit → comment → export draft (watermarked vs clean by plan) | Separate Next.js app; FFmpeg/render deps; comment read-state is browser-local |
| **2. Job & Gigs Marketplace** | `/jobs/*` postings & proposals; `/gigs/*` services & orders; Discovery for talent/teams | Post job **or** create gig → browse/save → proposal **or** order → accept/shortlist → contract handoff | Legacy `/orders` and `/my-orders` are placeholders; real flows under `/gigs/orders` |
| **3. Community Forums** | `/forums` groups, discussions, comments (MongoDB) | Create/join group → post discussion → comment → optional report | API boots without Mongo; forums degrade without it |
| **4. Asset Marketplace** | `/assets` library, purchase, reviews, licenses; in-editor market bridge | Browse → like/save → purchase with credits → download/review; optional seller listing + license assign / template use | Listings wait on media-worker previews; template troubleshooting deferred in docs |
| **5. Team Management** | `/teams` general (non-contractual) teams: roles, taskboard, video projects, wallet | Create team → invite/join → change role → taskboard action → optional team video project | Easy to confuse with **Workspaces**; plan/verification gates block create/join |
| **6. Contracts and Workspaces** | Escrow contracts, milestones, `/workspaces` contractual rooms, `/team-project/:id`, dashboard submit/review/rate | Funded job offer or gig confirm → workspace appears → submit milestone → approve/revision → mutual rate; optional dispute | Workspaces empty until funded; disputes are complex and Mongo-dependent for chat |

**Cross-product context for analysis covariates:** Free / Premium / Business plan features, account verification, and Credits/Subscriptions (`/credits-subscriptions`) gate many of the flows above—segment scores by plan and verification status when n allows.

## Full alpha survey instrument

**Administration:** Typeform / Google Form / in-app survey once per week of alpha, or at end of a moderated session. Show progress. Branch deep questions only when the corresponding feature was used. Collect screener **once** at cohort intake; reuse answers as covariates thereafter.

**Shared labels used below**

| Code | Scale |
|---|---|
| **L5** | 1 = Strongly disagree, 2 = Disagree, 3 = Neither agree nor disagree, 4 = Agree, 5 = Strongly agree |
| **SAT5** | 1 = Very dissatisfied, 2 = Dissatisfied, 3 = Neutral, 4 = Satisfied, 5 = Very satisfied |
| **SEQ7** | 1 = Very difficult … 7 = Very easy (label ends only; number all points) |
| **COMP5** | 1 = Much worse, 2 = Somewhat worse, 3 = About the same, 4 = Somewhat better, 5 = Much better |
| **N/A** | Did not use / Not applicable (exclude from means; report as usage %) |

---

### Section A — Screener / profile (intake only; ~6 items)

Ask once. Keep filters light; over-screening shrinks the pool ([BetaTesting screening](https://help.betatesting.com/en/articles/3915663-screening-surveys-screening-participants-for-beta-testing-user-research/); [Launching Next beta recruitment](https://www.launchingnext.com/blog/find-beta-testers/)).

| # | Question | Response options |
|---|---|---|
| **A1** | Which best describes your primary role when creating or hiring creative work? | Video editor / Motion designer · Producer / Creative lead · Freelancer (multi-discipline) · Client / buyer of creative services · Community manager / admin · Other (text) |
| **A2** | How often do you collaborate with others on video or creative projects? | Daily · A few times a week · Weekly · Monthly · Rarely / never |
| **A3** | How do you currently handle collaborative video review, hiring freelancers, or sharing creative assets? (select all) | Frame.io / similar · Premiere Team Projects / NLE collab · Google Drive + email · Upwork / Fiverr · Discord / Slack · Creative Market / stock sites · HoneyBook / Bonsai / contracts tools · Spreadsheets / ad hoc · Other |
| **A4** | Typical team size you work with on a project | Just me · 2–5 · 6–15 · 16+ |
| **A5** | Which device and browser will you primarily use for Ensemble alpha? | Desktop Chrome · Desktop Firefox · Desktop Edge/Safari · Tablet · Phone · Other |
| **A6** | Can you complete weekly feedback (~5 minutes) and at least one scripted task set during alpha? | Yes · No |

**Eligibility gate:** A6 = Yes; preferably A2 ≠ Rarely/never for ICP analyses. Tag power users from A3 tool count / A2 Daily for segmentation—not hard exclusion ([CleverX recruitment](https://cleverx.com/blog/how-to-recruit-participants-for-product-research/)).

---

### Section B — Usage filter (every pulse; gates deep questions)

| # | Question | Response options |
|---|---|---|
| **B1** | In the last 7 days, which Ensemble areas did you use? (select all) | Collaborative video editor · Jobs marketplace · Gigs marketplace · Community forums · Asset marketplace · Team management · Contracts / workspaces · None yet |
| **B2** | About how much time did you spend in Ensemble in the last 7 days? | &lt;30 min · 30–90 min · 2–5 hours · 5+ hours |

---

### Section C — Per-feature matrix (shared scale; every pulse)

**Instruction:** “For each area you used, rate your overall satisfaction. Choose **Did not use** if you did not try it this week.”

| Feature row | SAT5 | Did not use |
|---|---|---|
| **C1.** Cloud real-time collaborative video editor (projects + editor) | 1–5 | ☐ |
| **C2.** Jobs & gigs marketplace (postings, proposals, services, orders) | 1–5 | ☐ |
| **C3.** Community forums (groups, discussions, comments) | 1–5 | ☐ |
| **C4.** Asset marketplace / asset library | 1–5 | ☐ |
| **C5.** Team management (general teams, invites, roles, taskboard) | 1–5 | ☐ |
| **C6.** Contracts and workspaces (escrow contracts, milestones, contractual workspaces) | 1–5 | ☐ |

**Optional priority allocation (if survey tool supports; skip if time-boxed):** “Allocate 100 points across the six areas to show where Ensemble should improve next. Give 0 to areas you did not use.” ([Usertick feature satisfaction](https://usertick.com/en/templates/feature-satisfaction))

This matrix is the **primary cross-feature comparable statistic**. Do not change wording or scale mid-alpha ([Maze matrix guidance](https://help.maze.co/articles/1713486615-collect-multi-dimensional-feedback-with-the-matrix-block/)).

---

### Section D — Feature-specific deep questions (show only if used in B1)

Use **L5** unless noted. Cap at **3–4 items per used area** so the form stays near five minutes when someone used everything.

#### D1 — Collaborative video editor *(if B1 includes editor)*

| # | Question | Scale |
|---|---|---|
| **D1.1** | Were you able to create or open a project in the editor without help? | Yes / Partially / No |
| **D1.2** | I could leave feedback precise enough for a collaborator to act on. | L5 |
| **D1.3** | I knew who else was present or working in the project. | L5 |
| **D1.4** | Did you encounter lag, sync issues, lost edits, or a failed export? | Yes / No |
| **D1.5** *(optional)* | Compared with your primary alternative (Frame.io, Descript, Drive+email, NLE collab), Ensemble’s editor experience was… | COMP5 + N/A |

#### D2 — Jobs & gigs *(if B1 includes Jobs or Gigs)*

| # | Question | Scale |
|---|---|---|
| **D2.1** | Did you complete posting a job **or** creating a gig **or** submitting a proposal/order? | Yes / Partially / No |
| **D2.2** | Fees and how payment protection / escrow works were clear. | L5 |
| **D2.3** | I understood who is responsible if an engagement goes wrong. | L5 |
| **D2.4** | I trusted the platform enough to proceed with a counterparty. | L5 |
| **D2.5** *(optional)* | Compared with Upwork / Fiverr / direct hire, this marketplace experience was… | COMP5 + N/A |

#### D3 — Community forums *(if B1 includes Forums)*

| # | Question | Scale |
|---|---|---|
| **D3.1** | Did you successfully create a discussion **or** reply to one? | Yes / Partially / No |
| **D3.2** | I knew where the right place was to post. | L5 |
| **D3.3** | I understood when and how I would be notified. | L5 |
| **D3.4** | Labels and terms matched how I think about community spaces. | L5 |

#### D4 — Asset marketplace *(if B1 includes Assets)*

| # | Question | Scale |
|---|---|---|
| **D4.1** | Did you find at least one asset that fit a real need (or complete a seller listing)? | Yes / Partially / No |
| **D4.2** | Filters and search helped me narrow results efficiently. | L5 |
| **D4.3** | I understood what the license allows. | L5 |
| **D4.4** | Preview quality was enough to decide. | L5 |

#### D5 — Team management *(if B1 includes Teams)*

| # | Question | Scale |
|---|---|---|
| **D5.1** | Did you successfully invite someone **or** join a team? | Yes / Partially / No |
| **D5.2** | Role names matched what people could actually do. | L5 |
| **D5.3** | I felt confident I was not oversharing sensitive content. | L5 |
| **D5.4** | I could distinguish **general Teams** from **contract Workspaces**. | L5 |

#### D6 — Contracts and workspaces *(if B1 includes Contracts/Workspaces)*

| # | Question | Scale |
|---|---|---|
| **D6.1** | Did you reach a funded contract **or** open a contractual workspace? | Yes / Partially / No |
| **D6.2** | I understood payment / milestone status at all times. | L5 |
| **D6.3** | Scope, deliverables, and revision expectations were clear. | L5 |
| **D6.4** | I would trust this flow for a real paid engagement. | L5 |

Deep items synthesize category JTBD and friction patterns from collaborative-video, marketplace-trust, forum, asset-license, permissions, and contract-tool research ([Okopnyi et al. 2022](https://dl.acm.org/doi/fullHtml/10.1145/3546155.3546664); [ANODA marketplace UX](https://www.anoda.mobi/ux-blog/expert-solutions-for-marketplace-ui-ux-design); [Creative Market case work](https://www.stefangeles.com/creativemarket); [Miro roles](https://help.miro.com/hc/en-us/articles/360017571194-Roles-in-Miro); [G2 Bonsai vs HoneyBook](https://www.g2.com/compare/bonsai-vs-honeybook)).

---

### Section E — Overall product instruments

| # | Question | Scale | Timing |
|---|---|---|---|
| **E1** | Ensemble’s capabilities meet my requirements. | L5 (UMUX-Lite usefulness / UX-Lite wording) | Every pulse |
| **E2** | Ensemble is easy to use. | L5 (UMUX-Lite ease) | Every pulse |
| **E3** | Overall, how satisfied are you with Ensemble this week? | SAT5 | Every pulse |
| **E4** | How would you feel if you could no longer use Ensemble? | Very disappointed · Somewhat disappointed · Not disappointed (it isn’t really that useful) · N/A – I no longer use Ensemble | **Only if** used ≥2 times **and** used in last 14 days ([Real Startup Book PMF](https://anteo.gitbooks.io/the-real-startup-book/content/product-market_fit_survey/description.html)) |
| **E5** | How likely are you to recommend Ensemble to a colleague? | 0–10 | **Defer** until late beta; do not put on week-1 alpha form |

**UMUX-Lite scoring (5-point form):** mean of E1 and E2, or optional SUS estimate for 7-point historical form: `SUS ≈ 0.65 × ((Item1 + Item2 − 2) × (100/12)) + 22.9` when items were collected on 7 points ([MeasuringU UMUX-Lite](https://measuringu.com/umux-lite/)). For this instrument’s **5-point** collection, report **mean(E1,E2)** on 1–5 and optionally linearly convert to 7-point for literature comparison: `x7 = (x5 − 1)×(6/4) + 1` ([MeasuringU convert scales](https://measuringu.com/convert-point-scales/)).

**Sean Ellis score:** `%` answering **Very disappointed**, excluding N/A; compare directionally to **~40%** only with CIs and qualified cohort ([Learning Loop](https://learningloop.io/plays/product-market-fit-survey)).

**NPS:** when eventually collected, NPS = % promoters (9–10) − % detractors (0–6). Not a substitute for UMUX-Lite or the feature matrix.

---

### Section F — Bug / friction capture that still yields stats

| # | Question | Response options |
|---|---|---|
| **F1** | Did you hit a bug or error that fully blocked a workflow? | Yes / No |
| **F2** | Did anything almost stop you from finishing what you tried? | Confusing step · Bug / error · Slow performance · Unclear fees or permissions · Nothing · Other |
| **F3** | Overall stability this week felt… | Rock solid · Generally stable · Buggy but usable · Unstable |
| **F4** | If you hit a problem, how severe was the worst issue? *(soft triage signal)* | Blocker (could not continue) · Major (workaround painful) · Minor · Cosmetic · No problem |
| **F5** | Optional: What did you expect to happen, and what happened instead? | Short text (point serious items to a dedicated bug form with repro steps) |

Quantify **F1 Yes %**, **F2 category distribution**, and **F3/F4 ordinal means or % top boxes**. Treat F4 self-severity as soft; engineering severity comes from repro ([Klaritea beta ops](https://blog.klaritea.app/blog/beta-tester-recruitment); [betatest.ing](https://betatest.ing/beta-testing/beta-feedback-survey-questions)).

---

### Section G — Optional open text (max two)

| # | Question |
|---|---|
| **G1** | What is the single most important thing Ensemble should fix or improve next? |
| **G2** | Anything else we should know? (optional) |

---

### Task-session add-on (Layer C only; not in weekly email)

After **each** scripted task:

| # | Question | Scale |
|---|---|---|
| **T1** | Task completion | Success / Partial / Fail (observer or self) |
| **T2** | Overall, how difficult or easy was the task to complete? | SEQ7 |
| **T3** | If SEQ &lt; 5: Briefly, what made it difficult? | Short text ([MeasuringU SEQ](https://measuringu.com/seq10/)) |

Then administer Sections B–G once at session end.

## Scoring and statistics plan

**Alpha n will be small (≈5–30).** Statistics remain valid but detect only **large** differences; always show intervals ([MeasuringU: Small Sample Sizes](https://measuringu.com/small-n/)). Prefer **80–90%** confidence for exploratory alpha decisions; reserve 95% for claims you will publish externally ([MeasuringU: How Confident Do You Need to Be?](https://measuringu.com/confidence-levels/)).

### Computations

| Metric | How to compute | Notes |
|---|---|---|
| **Feature mean** | Mean of SAT5 for C1–C6 among respondents who did **not** select Did not use | Report n per row |
| **% top-2-box (T2B)** | % rating 4–5 on SAT5 or L5 | More sensitive than top-box alone at small n |
| **% bottom-2-box** | % rating 1–2 | Flags pain |
| **Usage rate** | % selecting each area in B1 (or non-N/A in matrix) | Usage × satisfaction → priority quadrants |
| **UMUX-Lite** | Mean of E1 & E2 per respondent; then cohort mean ± CI | Primary study-level usability/usefulness score |
| **SEQ** | Mean SEQ7 per task ± CI | Benchmark vs historical ≈ **5.5** |
| **Task success rate** | % Success (optionally Success+Partial); for tiny n prefer **Adjusted Wald** interval | Not raw 5/5 = 100% without interval |
| **Blocker rate** | % F1 = Yes with Adjusted Wald CI | Separate quality from usability |
| **Stability** | % “Rock solid” + “Generally stable” (top-2 of F3) | Trend week-over-week |
| **Sean Ellis** | % Very disappointed (qualified subset) ± Adjusted Wald | Ignore until qualification met |
| **Feature comparison** | Rank C1–C6 by mean and by T2B; highlight gaps only if CIs barely overlap or gap is large | Within-product comparison, not industry claim |
| **Segment cuts** | Role (A1), collab frequency (A2), plan/verification if known | Only if cell n ≥ ~5; else qualitative |

**Confidence intervals:** rating means → **t-based** CI; binary rates → **Adjusted Wald**; if collecting task times, geometric mean after log transform ([Sauro & Lewis Adjusted Wald](https://measuringu.com/papers/sauro-lewisHFES.pdf); [MeasuringU small-n](https://measuringu.com/small-n/)).

**Importance–satisfaction quadrant (optional):** x = usage rate or 100-point allocation; y = satisfaction mean. Prioritize **high usage + low satisfaction** first ([Formware](https://formware.io/templates/software-customer-satisfaction-survey-template/)).

### Charts and tables to produce each week

1. **Feature scorecard table:** Feature · n · Mean · 90% CI · % T2B · % Did not use  
2. **Bar chart:** six feature means with CI error bars (same axis 1–5)  
3. **UMUX-Lite sparkline:** weekly mean ± CI  
4. **Quality strip:** blocker % ± CI; stability top-2 %  
5. **Task dashboard** (if Layer C ran): task name · success % ± CI · SEQ mean ± CI  
6. **Quadrant:** usage × satisfaction for the six areas  
7. **Open-text codebook:** G1 themes with counts (not AI fluff—tag Fix / Missing / Confusing / Delight)

Do **not** declare “we beat industry SUS/NPS” from n &lt; 30 without intervals. Use scores for **build-over-build** and **feature-vs-feature** decisions inside Ensemble.

## Recommended alpha task scripts (short)

Run with a partner account where collab or marketplace counterparties are required. Record T1–T3 after each numbered task.

### 1) Collaborative video editor (~20–25 min)

1. Create a personal project from `/projects` and open it in the editor via handoff.  
2. Invite a second tester (share link / member); both join the same project.  
3. Upload a short clip; place it on the timeline; leave a comment/mention.  
4. Export a draft; note watermark vs clean based on plan.  
5. *(Optional)* Purchase or free-use a market asset in-editor; trash/restore the project from the main app.

### 2) Jobs & gigs (~15–20 min)

1. **Client path:** create a job posting (accept credit fee) **or** **Seller path:** create a gig service.  
2. Opposite role: browse → save → submit proposal **or** place order.  
3. Accept / shortlist → confirm path toward contract.  
4. Avoid legacy `/orders` placeholders; use `/gigs/orders` for gig order UIs.

### 3) Community forums (~10 min)

1. Create or join a group at `/forums`.  
2. Post a discussion; reply as second user.  
3. *(Optional)* Report a post; observe realtime feed update.

### 4) Asset marketplace (~15 min)

1. Browse `/assets` with filters; open an asset detail.  
2. Purchase with credits (or sandbox equivalent); download / leave a short review.  
3. *(Optional seller)* Check posting eligibility → upload listing → wait for preview processing.  
4. *(Optional)* Assign license to a video project or Use template.

### 5) Team management (~15 min)

1. Create a general team (check plan eligibility).  
2. Share join code / invite; second user joins.  
3. Change a role; create a taskboard item.  
4. Explicitly ask testers to state whether this felt like a **Team** or a **Workspace**.

### 6) Contracts and workspaces (~20–25 min)

1. From a job offer or gig confirm, accept so the contract funds in escrow.  
2. Open `/workspaces` or `/team-project/:id`; assign a task; optionally link a video project.  
3. Freelancer submits a milestone; client approves or requests revision.  
4. Complete → mutual rate on dashboard.  
5. *(Advanced / scripted only)* File a dispute—do not leave alpha users unsupervised on full dispute financial flows.

**Ops prerequisites before inviting testers:** Mongo running (forums/dispute chat); media worker for asset previews; editor + FFmpeg/render path healthy; credits seeded for posting/purchases; clear written distinction between Teams vs Workspaces in the test brief.

## What Ensemble already captures vs what this survey adds

| Existing in product | What it measures | Gap this alpha survey fills |
|---|---|---|
| Onboarding survey `/setup/survey` | Acquisition source, employment, purpose (earn/hire/explore) | Not usability, not feature-comparable, not alpha quality |
| Platform feedback `/landing/SendAFeedback` + `platform_ratings` | Global 1–5 + free-text suggestion | No per-feature matrix, no UMUX-Lite, no blocker %, no SEQ |
| Ticket satisfaction | Post-support 1–5 CSAT | Interaction-level only; not product/feature alpha |
| Contract / peer ratings | Mutual stars after closeout | Counterparty quality, not product UX |
| Asset reviews / team reviews | Listing or team stars | Marketplace/team reputation, not Ensemble UX scorecard |
| Admin analytics feedback tab | Aggregates suggestions/ratings | No standardized psychometrics or feature CIs |
| Editor comments | Collab UX feedback inside projects | Not a product survey |

**Bottom line:** Ensemble already has **stars and free-text** in many places, but **no statistics-ready alpha instrument** that compares the six product areas on one scale, estimates overall usability/usefulness with UMUX-Lite, and quantifies blockers with intervals. This questionnaire adds that layer; keep existing stars for marketplace/peer reputation and route severe F5 write-ups into the engineering bug form rather than replacing either system.

## Conclusion

The decision-ready move is to run Ensemble alpha as a **scorecard product**, not a comment box: one shared **SAT5** matrix across the six real surfaces, **UMUX-Lite** every pulse, **SEQ + completion** on scripted tasks, and **blocker rates with Adjusted Wald intervals** so a noisy n=12 still informs prioritization. Deferring NPS until late beta protects the team from loyalty noise while the editor handoff, Mongo-backed forums, media-worker assets, and Teams-vs-Workspaces confusion are still the real learning agenda. Ship the weekly form as written, keep wording frozen for trendability, and treat the first three pulses as the baseline that tells you which of the six areas is earning—or burning—tester trust.
