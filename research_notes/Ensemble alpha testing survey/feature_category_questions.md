# Feature-category survey & usability evaluation questions (creative SaaS / marketplace / collaboration)

Scope: alpha-appropriate, quantifiable survey items for (1) cloud real-time collaborative video editors, (2) jobs & gigs marketplaces, (3) community forums, (4) asset marketplaces, (5) team management, (6) contracts & workspaces. Notes are for a report writer; every claim includes a source URL.

## What do alpha testers typically evaluate first in each category?

### Takeaway
Across these categories, alpha evaluation almost always starts with **core-task completion and first-session friction** (can the user finish the job that defines the product?), then **trust/safety signals** on marketplaces and **collaboration/awareness** on multiplayer tools—not polish, full feature parity, or mature NPS.

### Cited Findings
- Beta survey guidance recommends early/mid-beta focus on ease of core tasks, onboarding clarity, and blocking bugs; NPS and competitive comparison belong in a **final-week** wrap-up after enough real use — [Zonka Feedback – Beta Testing Survey](https://www.zonkafeedback.com/blog/beta-testing-survey)
- SaaS beta survey templates lead with core-problem solving, ease of getting started, and workflow-blocking bugs before pricing/subscribe intent — [SurveyMars – SaaS Beta Testing Feedback Surveys](https://ap.surveymars.com/knowledge/saas-beta-testing-feedback-surveys-for-developer-insights/)
- Collaborative video review pilots commonly measure **usability** and **self-efficacy** first; Frame.io pilot respondents rated usability M = 4.57 and self-efficacy M = 4.43 (5-point Likert), with open themes around timestamped feedback clarity and workflow streamlining — [McEdwards 2024 – Frame.io COIL/VE study](https://doi.org/10.37120/ijttl.2024.20.2.02)
- IDC/Frame.io business-value research frames the primary jobs as reducing revision cycles, organizing frame-accurate feedback, and version/audit management vs ad-hoc email + file sync — [IDC White Paper – Business Value of Frame.io (PDF)](https://frameio-email-marketing.s3.amazonaws.com/_core_assets/pdfs/Whitepaper+-+Business+Value+of+Frame.io.pdf)
- CSCW research on collaborative video editing identifies **workspace awareness** (“Who is present?”, “What are they doing?”, “Where are they working?”) as the first design concern when moving from solo NLE tools to shared editors — [Okopnyi et al. 2022 – Designing for Collaborative Video Editing](https://dl.acm.org/doi/fullHtml/10.1145/3546155.3546664); awareness framework from [Gutwin & Greenberg workspace awareness](https://dl.acm.org/doi/10.1145/3546155.3546664)
- Freelance marketplace research instruments start with match time, trust in the platform when choosing counterparties, acceptable platform fee %, and necessary vs unnecessary features — [TalentHub survey/interview questions (PDF)](https://www.enidlam.com/projects/talentHub/interviewQuestions.pdf)
- Online labor-platform trust research treats **job standardization, transparency, privacy & safety, and regulations & compliance** as first-order trust antecedents for service requesters — [University of Twente thesis – trust antecedents on OLPs](https://essay.utwente.nl/fileshare/file/109696/Final%20version%20Master%20Thesis.pdf)
- Marketplace UX practice prioritizes verifying that both sides can complete the critical transaction flow (search → trust signals → booking/purchase → fulfillment/dispute path) before optimizing secondary UI — [ANODA – Marketplace UX Design](https://www.anoda.mobi/ux-blog/expert-solutions-for-marketplace-ui-ux-design)
- Creative Market product work prioritized search/browse/checkout, product detail comprehension (esp. licensing), and seller upload/listing quality as conversion-critical first surfaces — [Stef Angeles – Creative Market](https://www.stefangeles.com/creativemarket); [David Panarelli – Creative Market turnaround](https://www.dpan.co/creative-market-turnaround)
- Discourse hallway usability testing focused first on notification controls, terminology (“topic” vs “thread”), topic map discoverability, and finding view counts/activity — [Meta Discourse – hallway usability testing notes](https://meta.discourse.org/t/notes-from-some-recent-hallway-usability-testing/108934)
- Discord server-management usability research objectives centered on **create server** and **create/assign roles** as first evaluable admin tasks — [Hannah Goh – Discord server management usability](https://www.hannahgoh.com/home/discord-usability)
- Team-product permission models (Miro roles; Notion workspace/teamspace/page levels) imply alpha should first validate invite → role assignment → correct access outcome — [Miro Help – Roles](https://help.miro.com/hc/en-us/articles/360017571194-Roles-in-Miro); [Notion – teamspaces & access](https://www.notion.com/help/guides/grant-access-teamspaces)
- Freelance contract tools (HoneyBook/Bonsai class) are judged first on ease of setup, sending contracts/proposals, invoicing/payments, and client portal clarity — [G2 – Bonsai vs HoneyBook](https://www.g2.com/compare/bonsai-vs-honeybook); [Capterra – Bonsai reviews](https://www.capterra.com/p/238825/Bonsai/reviews/)

### Inferences
- **Per-category “evaluate first” stack (alpha):**
  1. **Collaborative video editors:** upload/import → playback → leave/resolve frame-accurate comment → share review link → (if editing) concurrent awareness without data loss.
  2. **Jobs/gigs marketplaces:** post or find job → evaluate counterparty trust signals → message/proposal → understand fees/protection (even if escrow is stubbed).
  3. **Community forums:** join/find community → create post/thread → reply/notify → find content via search/categories.
  4. **Asset marketplaces:** search/filter → preview → understand license → purchase/download (or seller: upload + metadata + price/license).
  5. **Team management:** invite → accept → assign role → verify permission boundary → basic task/board action.
  6. **Contracts & workspaces:** create/send contract or SOW → e-sign → open project room → submit/approve deliverable → invoice/milestone status.
- Sean Ellis PMF (“very disappointed if product went away”) and NPS should **not** be first-session instruments; they need repeated use of the core value prop — [Precoil – NPS vs PMF](https://www.precoil.com/articles/net-promoter-score-or-product-market-fit-survey)

### Gaps
- No public Frame.io/Descript/CapCut **official alpha survey instruments** were found; evaluation priorities are inferred from academic pilots, CSCW design studies, IDC ROI framing, and generic SaaS beta templates.
- Limited primary research specifically titled “alpha testing checklist” for creative-collaboration SaaS; industry beta blogs are secondary and should be treated as practitioner guidance, not validated psychometrics.

---

## What failure modes / friction points are standard to ask about?

### Takeaway
Standard friction probes are **task-blocking bugs, unclear system status, trust/responsibility ambiguity on marketplaces, collaboration distraction or conflict on editors, terminology/navigation on forums, and permission surprises on team admin**—plus binary “did you complete X?” items for comparable stats.

### Cited Findings
- Collaborative video editors: TrustRadius reviewers cite lag/sync delay, transcription/editing friction, feedback organization limits, huge-file upload pain, and weak onboarding for non-experts — [TrustRadius – Descript vs Frame.io](https://www.trustradius.com/compare-products/descript-vs-frame-io)
- Collaborative video CSCW workshops: awareness UI can **distract** editors; bin locking / conflict over timeline regions; abstract timeline representations make awareness harder than in docs — [Okopnyi et al. 2022](https://dl.acm.org/doi/fullHtml/10.1145/3546155.3546664)
- Frame.io educational pilot: mobile access issues and uneven stakeholder adoption as friction themes — [McEdwards 2024](https://doi.org/10.37120/ijttl.2024.20.2.02)
- IDC situates legacy failure modes as email-buried feedback, no frame-specific comments, long upload/download, missing audit trail, excess revision cycles — [IDC Frame.io white paper](https://frameio-email-marketing.s3.amazonaws.com/_core_assets/pdfs/Whitepaper+-+Business+Value+of+Frame.io.pdf)
- Marketplace apps: distrust driven by **interface complexity** and unclear **who is responsible** (platform vs third-party seller) during mediation — [IHC 2024 – Feeling Fishy… marketplace interface study](https://dl.acm.org/doi/10.1145/3702038.3702095)
- Marketplace trust & safety UX checklist: weak verification/reputation, opaque payment hold/release, unclear cancellation/dispute rules, hard-to-find reporting — [ANODA marketplace UX](https://www.anoda.mobi/ux-blog/expert-solutions-for-marketplace-ui-ux-design)
- Freelancer payment questionnaires probe escrow frustration: fees, dispute handling, delays, fairness, ratings concerns — [Scribd – Freelancer Payment Experience Questionnaire](https://www.scribd.com/document/939657323/Freelancer-Questionnaire-Upwork-1)
- TalentHub instruments ask top-3 obstacles, trust level, complicated/unnecessary features, acceptable match duration — [TalentHub PDF](https://www.enidlam.com/projects/talentHub/interviewQuestions.pdf)
- Discourse: notification misunderstanding, topic map appearing only after replies, terminology mismatch — [Meta Discourse usability notes](https://meta.discourse.org/t/notes-from-some-recent-hallway-usability-testing/108934)
- Discord heuristic evals: visibility of system status (voice connected), terminology (“server”/“channel”), missing back/cancel, mute/deafen confusion, search filter disappearance — [Aarone Amino – Discord heuristic evaluation](https://www.aaroneamino.com/portfolio/discord); [Ross Porter – Discord redesign heuristics](https://www.rossporterux.design/work/discord-redesign); [Emily Gueldner – Discord search](https://www.emilygueldner.com/work/discord-search)
- Discord admin: struggle adding roles from members screen; unexpected save behavior; hard-to-find server settings — [Hannah Goh](https://www.hannahgoh.com/home/discord-usability)
- Asset marketplace: licensing comprehension affects AOV; seller upload complexity (esp. fonts/licenses); search filter discoverability — [Stef Angeles – Creative Market](https://www.stefangeles.com/creativemarket); [Seah – Creative Market product uploader](https://www.seahcb.com/work/creative-market-product-uploader)
- Collaboration tools appropriated for research: navigation of large canvases; “territoriality” when everyone can edit everything — [SpaceHuddle full paper](https://spacehuddle.app/SpaceHuddle_Fullpaper.pdf)
- Permissions products: inheritance/overrides and guest vs member confusion; free-tier privacy assumptions unsafe — [WorkOS – multi-tenant permissions lessons](https://workos.com/blog/multi-tenant-permissions-slack-notion-linear); [Toollers – Notion vs Miro](https://toollers.com/compare/notion-vs-miro/)
- Freelance contract tools: payment processing fees, learning curve for advanced automation, weak team permission granularity, incomplete proposal→contract→invoice automation chain — [Capterra Bonsai reviews](https://www.capterra.com/p/238825/Bonsai/reviews/); [G2 Bonsai vs HoneyBook](https://www.g2.com/compare/bonsai-vs-honeybook)

### Inferences
- **Quantifiable friction question patterns (use across categories):**
  - Binary task success: “Were you able to complete [core task] without help?” (Y/N)
  - Binary blocker: “Did you hit a bug that fully blocked your workflow?” (Y/N + optional repro) — [SurveyMars beta template](https://ap.surveymars.com/knowledge/saas-beta-testing-feedback-surveys-for-developer-insights/)
  - Effort: “How much effort did [task] take?” (1–5 or CES-style)
  - Stability: Rock solid / Generally stable / Buggy but usable / Unstable — [SurveyMars](https://ap.surveymars.com/knowledge/saas-beta-testing-feedback-surveys-for-developer-insights/)
  - Trust clarity (marketplaces/contracts): “I understood who is responsible if something goes wrong” (Likert) — inferred from [IHC 2024](https://dl.acm.org/doi/10.1145/3702038.3702095) + [ANODA](https://www.anoda.mobi/ux-blog/expert-solutions-for-marketplace-ui-ux-design)
- **Category-specific failure probes to include:**
  | Category | Standard friction asks |
  |---|---|
  | Collab video | Sync/lag; comment precision; version confusion; upload failure; awareness distraction; lost edits |
  | Jobs/gigs | Fee opacity; weak trust signals; slow match; proposal spam/cost; dispute fear |
  | Forums | Can’t find channel/topic; notification overload/underload; search fail; jargon |
  | Asset market | Can’t find asset; license unclear; preview inadequate; download fail; listing upload drop-off |
  | Team admin | Invite fail; wrong permissions; role meaning unclear; accidental overshare |
  | Contracts/workspaces | Scope ambiguity; sign fail; deliverable approval path unclear; payment timing/leverage |

### Gaps
- No single published “standard failure-mode battery” covering all six Ensemble-like categories; matrix above synthesizes adjacent domains.
- Upwork/Fiverr official research questionnaires are largely not public (third-party PDFs/theses used as proxies).

---

## What willingness-to-pay or value questions are appropriate at alpha?

### Takeaway
At alpha, prefer **value and commitment-proxies** (problem severity, current spend, paid-pilot / early-access intent, Van Westendorp ranges) over hard price optimization; treat stated WTP as directional and segment by users who already pay for workarounds.

### Cited Findings
- Alpha/beta pricing section commonly asks likelihood to subscribe at a stated price; keep surveys 10–15 questions — [SurveyMars SaaS beta surveys](https://ap.surveymars.com/knowledge/saas-beta-testing-feedback-surveys-for-developer-insights/)
- Stronger WTP practice: establish **current spend** on the problem first; then Van Westendorp four prices; then frictioned commitment (“join paid pilot this month?”, “send checkout link?”) — [Hypothis – WTP survey questions](https://hypothis.ai/blog/willingness-to-pay-survey-questions)
- Pre-order/deposit/paid pilot/checkout tests beat survey-only WTP for real signal — [Buteo – test WTP before you build](https://buteo.ink/guides/test-willingness-to-pay)
- Concept-testing banks include Van Westendorp + “pay to try in beta?” + 30-day try likelihood — [ValidateThat – 30 concept testing questions](https://validatethat.io/howto/concept-testing-questions)
- BetaTesting support lists price range, Van Westendorp-style cheap/bargain, value 1–10, and competitor switch-if-cheaper items — [BetaTesting – Common Survey Questions](https://help.betatesting.com/en/articles/7891636-common-survey-questions)
- Freelancer/client fee sensitivity is often asked as **acceptable % of project value** as platform fee — [TalentHub PDF](https://www.enidlam.com/projects/talentHub/interviewQuestions.pdf)
- Zonka notes final beta is when value-vs-price and Sean Ellis PMF become meaningful — [Zonka beta testing survey](https://www.zonkafeedback.com/blog/beta-testing-survey)
- Sean Ellis: “How disappointed would you be if you could no longer use [product]?” — target ~40% “Very” among users who experienced core value repeatedly — [Precoil](https://www.precoil.com/articles/net-promoter-score-or-product-market-fit-survey); [Michael Houck – PMF vs NPS](https://michaelhouck.co/essays/pmf-vs-nps)
- UMUX-Lite / UX-Lite (usefulness + ease) correlates with SUS and likelihood-to-recommend; useful short value/usability proxy at alpha — [MeasuringU – UMUX-Lite to UX-Lite](https://measuringu.com/from-umux-lite-to-ux-lite/); [UMUX-LITE CHI paper](https://dl.acm.org/doi/10.1145/2470654.2481287)
- Frame.io value framing uses operational ROI proxies (revision cycles, turnaround, deadlines met)—useful as **perceived-value** Likert items even when money questions are soft — [IDC white paper](https://frameio-email-marketing.s3.amazonaws.com/_core_assets/pdfs/Whitepaper+-+Business+Value+of+Frame.io.pdf)

### Inferences
- **Alpha-appropriate WTP / value set (recommended):**
  1. “What do you currently spend (money + tools) to solve [problem]?” (numeric / bands) — [Hypothis](https://hypothis.ai/blog/willingness-to-pay-survey-questions)
  2. UMUX-Lite: “Capabilities meet my requirements”; “Easy to use” (5- or 7-point) — [MeasuringU](https://measuringu.com/from-umux-lite-to-ux-lite/)
  3. “If this launched at $X / take-rate Y%, how likely would you pay?” (5-point) — [SurveyMars](https://ap.surveymars.com/knowledge/saas-beta-testing-feedback-surveys-for-developer-insights/)
  4. Optional Van Westendorp (4 open prices) if ≥~30 responses expected — [ValidateThat](https://validatethat.io/howto/concept-testing-questions)
  5. “Would you join a paid pilot / prepay for early access at $X?” (Y/N/Need more info) — [Hypothis](https://hypothis.ai/blog/willingness-to-pay-survey-questions)
  6. Marketplace-specific: acceptable platform fee % — [TalentHub](https://www.enidlam.com/projects/talentHub/interviewQuestions.pdf)
  7. Delay full NPS; optional Sean Ellis only after repeated core-task use — [Precoil](https://www.precoil.com/articles/net-promoter-score-or-product-market-fit-survey)
- **Avoid at early alpha:** pure “what would you pay?” without baseline spend; blending free-tier tire-kickers with ICP paying users without segmentation — [Mapster pricing questions](https://www.mapster.io/survey-questions/pricing)

### Gaps
- No Ensemble-specific pricing research found; $X anchors must be set from product strategy, not from these sources.
- Academic validation that Van Westendorp predicts creative-SaaS conversion at **alpha** incompleteness levels was not found; treat as directional.

---

## What competitor comparison questions are useful?

### Takeaway
Useful alpha/beta competitor questions are **neutral relative ratings** against the respondent’s current tool (ease, speed, value, trust/support), plus “what they do better / we do better,” asked after enough product exposure—not day-one.

### Cited Findings
- Final beta surveys should include competitive comparison once testers have enough exposure; avoid early NPS noise — [Zonka beta testing survey](https://www.zonkafeedback.com/blog/beta-testing-survey)
- Competitor comparison templates ask: previous tool; agree-scale comparisons on ease/speed/value/support; open “what old way did better” — [Usertick – Competitor Comparison Survey](https://usertick.com/en/templates/competitor-comparison)
- Neutral framing (“How does X compare to Y?”) beats leading “How much better…”; avoid double-barreled speed+price items — comparison survey guidance summarized in search synthesis pointing to relative scales — [Usertick](https://usertick.com/en/templates/competitor-comparison); [BetaTesting common questions](https://help.betatesting.com/en/articles/7891636-common-survey-questions)
- Collaborative video experiment goals include Likert willingness to use vs existing platforms — [UBC Collaborative Video Project – evaluation goals](https://blogs.ubc.ca/collaborativevideo/2016/02/22/update-3e-proposed-goals-of-experiment/)
- TalentHub asks which marketplace was most satisfying and why; overall experience with listed sites — [TalentHub PDF](https://www.enidlam.com/projects/talentHub/interviewQuestions.pdf)
- TrustRadius-style attribute comparisons for editors surface likelihood-to-recommend, usability, collaboration fit vs editing depth — [TrustRadius Descript vs Frame.io](https://www.trustradius.com/compare-products/descript-vs-frame-io)
- UserTesting competitor-evaluation practice: decide whether to recruit naive vs loyal competitor users; reuse same task plan across products — [UserTesting – Evaluate Competitors template](https://www.usertesting.com/resources/templates/competitor-evaluation)

### Inferences
- **Recommended competitor block (quant + light qual):**
  1. “Which tools do you currently use for [job]?” (multi-select: Frame.io, Descript, Premiere/Team Projects, Upwork, Fiverr, Discord, Reddit, Creative Market, Miro, Notion, HoneyBook/Bonsai, Other)
  2. “Compared with your primary alternative, this product is…” (Much worse ←→ Much better) for: ease of core task; speed; trust/safety; collaboration; value for money
  3. Binary: “Would you switch your primary tool to this for [job] if it were production-ready?” (Y/N/Not sure)
  4. “Primary reason you would switch / would not switch” (coded multi-choice + Other)
  5. Open (optional, one only): “What does your current tool still do better?”
- Category anchors for “primary alternative”:
  - Video collab: Frame.io / Descript / Drive+email / Premiere Team Projects
  - Gigs: Upwork / Fiverr / direct outreach
  - Forums: Discord / Reddit / Slack / Discourse
  - Assets: Creative Market / Adobe Stock / Envato / Google Drive libraries
  - Team admin: Notion / Miro / Asana/Linear / Google Workspace sharing
  - Contracts: HoneyBook / Bonsai / DocuSign+Drive / email+PDF

### Gaps
- Few published A/B competitor survey instruments from Frame.io, Upwork, or Creative Market themselves; templates are mostly vendor/blog sources.
- Side-by-side moderated tests (UserTesting style) produce richer data than surveys alone but are outside pure survey scope.

---

## Are there published UX heuristics or checklist items for collaborative editors, marketplaces, forums, or team admin?

### Takeaway
Yes—mostly **adapted Nielsen heuristics** plus domain overlays: **workspace awareness** for collab editors, **trust/mediation clarity** for marketplaces, **terminology/status/search** for forums/Discord-class products, and **role/inheritance predictability** for team admin. No single canonical “Ensemble hexad” checklist exists.

### Cited Findings
- **General:** Nielsen’s 10 heuristics + severity 0–4 are the default evaluation frame used in Discord portfolio studies — [Aarone Amino Discord HE](https://www.aaroneamino.com/portfolio/discord); NN/g heuristics referenced therein
- **Collaborative editors / CSCW:** Workspace awareness checklist categories (who/what/where) recommended for real-time shared workspaces; video-specific caution that awareness widgets can distract; design concepts include presence, multi-playheads, locks/time-slot separation, annotations, editing logs — [Okopnyi et al. 2022](https://dl.acm.org/doi/fullHtml/10.1145/3546155.3546664)
- **Marketplaces:** Adapted Nielsen set validated for e-commerce marketplace HE (visibility of status, real-world match, user control, consistency, error prevention, recognition, etc.) — [MJOC – Heuristic Evaluation of E-commerce Marketplace](https://doi.org/10.24191/mjoc.v7i2.19070)
- **Marketplace trust checklist (practitioner):** verification, reputation, payment protection, clear rules, responsiveness, reporting; dual-sided metrics (search-to-book, acceptance/response time, disputes, repeat use) — [ANODA](https://www.anoda.mobi/ux-blog/expert-solutions-for-marketplace-ui-ux-design)
- **Marketplace distrust patterns:** communicate platform vs seller responsibility; reduce interface complexity that obscures protection — [IHC 2024 Feeling Fishy](https://dl.acm.org/doi/10.1145/3702038.3702095)
- **Forums:** Discourse internal hallway testing notes function as a practical checklist (notifications, topic map, terminology, editor complexity) — [Meta Discourse](https://meta.discourse.org/t/notes-from-some-recent-hallway-usability-testing/108934)
- **Community chat:** Discord HE case studies repeatedly flag status visibility, terminology match, user control/freedom, recognition vs recall, search affordances — [Amino](https://www.aaroneamino.com/portfolio/discord); [Porter](https://www.rossporterux.design/work/discord-redesign); [Gueldner search](https://www.emilygueldner.com/work/discord-search)
- **Team admin / permissions:** Documented role matrices (Miro visitor/guest/member/admin/owner; Notion full access→view inheritance with highest-permission-wins) are de facto checklist items for admin UX — [Miro roles](https://help.miro.com/hc/en-us/articles/360017571194-Roles-in-Miro); [WorkOS permissions article](https://workos.com/blog/multi-tenant-permissions-slack-notion-linear); [Notion teamspaces](https://www.notion.com/help/guides/grant-access-teamspaces)
- **Standardized UX scales (cross-category):** SUS; UMUX-Lite/UX-Lite (ease + usefulness); NPS LTR; SUPR-Q mentioned as related web UX battery — [MeasuringU UMUX-Lite](https://measuringu.com/from-umux-lite-to-ux-lite/); [MeasuringU NPS from SUS](https://measuringu.com/nps-sus/)
- **Creative Market process checklist:** feedback at idea/prototype/live stages; post-ship “was feedback considered?” satisfaction target ~8.5 — [Medium – Building Creative Market UX bar](https://medium.com/building-creative-market/raising-our-user-experience-design-bar-1b03e371abee)

### Inferences
- For Ensemble alpha, run a **hybrid instrument**: short psychometrics (UMUX-Lite + 1 task-success battery) + category heuristic probes, rather than full 10-item SUS every time.
- Publishable “checklist” to operationalize in surveys (Likert: Strongly disagree–Strongly agree):
  - Collab editor: “I always knew who else was working on the project”; “I could leave feedback on the exact moment I meant”; “I never feared losing work to someone else’s edit”
  - Marketplace: “I understood fee and protection terms”; “I trusted the other party enough to proceed”; “I knew how to get help if something went wrong”
  - Forum: “I could find the right place to post”; “I understood when I would be notified”; “Search returned what I needed”
  - Team admin: “Role labels matched what people could actually do”; “I could invite someone without oversharing”; “I could fix a permission mistake easily”

### Gaps
- No ISO/NN/g official specialized heuristic set solely for “collaborative video editors” beyond general CSCW awareness literature.
- Deceptive-pattern / dark-pattern marketplace HE (e.g., Brazilian pharma marketplace IDA scoring) is adjacent but less relevant to early creative-SaaS alpha — [CEUR paper](https://ceur-ws.org/Vol-4217/paper4.pdf)

---

## Per category: JTBD, alpha metrics, and concrete survey questions

### Takeaway
Below is a synthesis bank of **jobs-to-be-done, alpha metrics, and 8–10 quantifiable questions per category**, combining the cited sources with alpha constraints (incomplete product OK; emphasize task success + Likert + binary).

### Cited Findings
- Scales and timing guidance drawn from: [SurveyMars](https://ap.surveymars.com/knowledge/saas-beta-testing-feedback-surveys-for-developer-insights/), [Zonka](https://www.zonkafeedback.com/blog/beta-testing-survey), [MeasuringU UMUX-Lite](https://measuringu.com/from-umux-lite-to-ux-lite/), [Precoil PMF](https://www.precoil.com/articles/net-promoter-score-or-product-market-fit-survey), [Hypothis WTP](https://hypothis.ai/blog/willingness-to-pay-survey-questions)
- Domain JTBD/friction evidence: video — [IDC](https://frameio-email-marketing.s3.amazonaws.com/_core_assets/pdfs/Whitepaper+-+Business+Value+of+Frame.io.pdf), [Okopnyi 2022](https://dl.acm.org/doi/fullHtml/10.1145/3546155.3546664), [McEdwards 2024](https://doi.org/10.37120/ijttl.2024.20.2.02); gigs — [TalentHub](https://www.enidlam.com/projects/talentHub/interviewQuestions.pdf), [Twente trust thesis](https://essay.utwente.nl/fileshare/file/109696/Final%20version%20Master%20Thesis.pdf); forums — [Discourse meta](https://meta.discourse.org/t/notes-from-some-recent-hallway-usability-testing/108934), [Discord HE cases](https://www.aaroneamino.com/portfolio/discord); assets — [Creative Market case studies](https://www.stefangeles.com/creativemarket); team — [Miro](https://help.miro.com/hc/en-us/articles/360017571194-Roles-in-Miro)/[Notion](https://www.notion.com/help/guides/grant-access-teamspaces)/[WorkOS](https://workos.com/blog/multi-tenant-permissions-slack-notion-linear); contracts — [G2/Capterra HoneyBook–Bonsai](https://www.g2.com/compare/bonsai-vs-honeybook), [ANODA trust](https://www.anoda.mobi/ux-blog/expert-solutions-for-marketplace-ui-ux-design)

### Inferences

#### Shared instrument header (all categories)
Use at top of every alpha survey for comparability:
1. UMUX-Lite Ease: “This product is easy to use.” (1–5)
2. UMUX-Lite Usefulness: “This product’s capabilities meet my requirements.” (1–5)
3. “I completed the assigned core task.” (Yes / Partially / No)
4. “I hit a workflow-blocking bug.” (Yes / No)
5. Optional late-alpha: Sean Ellis disappointment (Very / Somewhat / Not at all)

**Domain-specific scale notes:** Prefer 5-point Likert for matrix compatibility with UMUX-Lite/SUS items ([MeasuringU](https://measuringu.com/from-umux-lite-to-ux-lite/)). Reserve 0–10 NPS for end-of-beta only ([Zonka](https://www.zonkafeedback.com/blog/beta-testing-survey); [Precoil](https://www.precoil.com/articles/net-promoter-score-or-product-market-fit-survey)).

---

#### 1) Cloud real-time collaborative video editors
**JTBD:** Review/approve video with frame-accurate feedback; reduce revision cycles; share securely with internal/external stakeholders; coordinate concurrent edit/review without version chaos ([IDC](https://frameio-email-marketing.s3.amazonaws.com/_core_assets/pdfs/Whitepaper+-+Business+Value+of+Frame.io.pdf); [Okopnyi 2022](https://dl.acm.org/doi/fullHtml/10.1145/3546155.3546664)).

**Alpha metrics:** Task success (upload, comment, share); time-on-task / hesitation errors ([UBC goals](https://blogs.ubc.ca/collaborativevideo/2016/02/22/update-3e-proposed-goals-of-experiment/)); usability & self-efficacy Likert ([McEdwards](https://doi.org/10.37120/ijttl.2024.20.2.02)); # revision-cycle perception; blocking-bug rate; presence/awareness comprehension.

**Survey questions (8–10):**
1. Did you successfully upload or open a video project? (Y/N)
2. Did you leave a comment/annotation on a specific moment in the timeline? (Y/N)
3. “I could make my feedback precise enough for an editor to act on.” (1–5)
4. “I always knew who else was present or working in the project.” (1–5)
5. “Collaboration features helped more than they distracted me.” (1–5)
6. Did you encounter lag, sync issues, or lost edits? (Y/N)
7. “Sharing a review link with a teammate/client was straightforward.” (1–5)
8. Compared with Frame.io / Descript / email+Drive, this was… (Much worse–Much better)
9. “If production-ready, how likely would you use this for a real client review this month?” (1–5)
10. Would you join a paid pilot at $X/editor/mo? (Y/N/Need info)

---

#### 2) Jobs & gigs marketplaces
**JTBD:** Find trustworthy counterparties quickly; agree scope/price; exchange work with payment protection; build reputation ([TalentHub](https://www.enidlam.com/projects/talentHub/interviewQuestions.pdf); [Twente](https://essay.utwente.nl/fileshare/file/109696/Final%20version%20Master%20Thesis.pdf); [ANODA](https://www.anoda.mobi/ux-blog/expert-solutions-for-marketplace-ui-ux-design)).

**Alpha metrics:** Match-path task success; time-to-first meaningful contact; trust Likert; fee comprehension; search-with-results / proposal send success; dispute-path findability (even if mocked).

**Survey questions:**
1. Did you complete posting a job **or** submitting a proposal/application? (Y/N)
2. “I trusted the platform enough to proceed with a counterparty.” (1–5)
3. “Fees and how payment protection works were clear.” (1–5)
4. “I understood who is responsible if the engagement goes wrong.” (1–5)
5. How long did matching/contact take vs acceptable? (Faster / About right / Too slow)
6. What % platform fee is acceptable on a typical project? (bands or open %) — [TalentHub](https://www.enidlam.com/projects/talentHub/interviewQuestions.pdf)
7. “Reviews/ratings (or their absence) affected my willingness to proceed.” (1–5)
8. Compared with Upwork/Fiverr/direct hire, overall experience was… (Much worse–Much better)
9. Did anything feel unsafe, spammy, or unfair? (Y/N + optional text)
10. Would you pay to access this marketplace (subscription or take-rate) at stated terms? (Definitely–Definitely not)

---

#### 3) Community forums (Reddit/Discord/Discourse-style)
**JTBD:** Join the right space; ask/share; get notified appropriately; find prior knowledge; moderate/role-manage for admins ([Discourse meta](https://meta.discourse.org/t/notes-from-some-recent-hallway-usability-testing/108934); [Discord HE](https://www.aaroneamino.com/portfolio/discord)).

**Alpha metrics:** Post/reply success; time-to-first post; notification comprehension; search success; terminology confusion rate; admin role-assign success.

**Survey questions:**
1. Did you successfully create a post/thread? (Y/N)
2. Did you successfully reply to someone else’s post? (Y/N)
3. “I knew where the right place was to post.” (1–5)
4. “I understood when and how I would be notified.” (1–5)
5. Did you find an existing answer via search or categories? (Y/N/Did not try)
6. “Labels and terms matched how I think (post/thread/channel/server).” (1–5)
7. “The community felt welcoming enough to contribute again.” (1–5)
8. Compared with Discord/Reddit/Slack, this was… (Much worse–Much better) for product-community use
9. (Admins) Did you create or assign a role/permission? (Y/N)
10. “I would return to this community weekly if my peers were here.” (1–5)

---

#### 4) Asset marketplaces (stock, templates, media libraries)
**JTBD:** Discover fit-for-purpose assets; preview quality; understand license; purchase/download quickly; (sellers) list with correct metadata/pricing/license ([Stef Angeles](https://www.stefangeles.com/creativemarket); [uploader case](https://www.seahcb.com/work/creative-market-product-uploader); [Panarelli](https://www.dpan.co/creative-market-turnaround)).

**Alpha metrics:** Search-to-preview rate; license-comprehension correct/incorrect; checkout/download success; seller listing completion; filter use; AOV intent.

**Survey questions:**
1. Did you find at least one asset that fit your need? (Y/N)
2. “Filters/search helped me narrow results efficiently.” (1–5)
3. “Preview quality was enough to decide.” (1–5)
4. “I understood what the license allows.” (1–5) *[critical per Creative Market AOV work]*
5. Did you complete purchase **or** download (or sandbox equivalent)? (Y/N)
6. (Sellers) Did you complete uploading a listing with price + license metadata? (Y/N)
7. “I trusted the seller/platform enough to use this asset commercially.” (1–5)
8. Compared with Creative Market / Adobe Stock / Envato, discovery was… (Much worse–Much better)
9. How much would you expect to pay for a similar asset/pack? (bands)
10. Would you buy credits/subscription at $X if available? (Y/N/Need info)

---

#### 5) Team management (roles, invites, permissions, taskboards)
**JTBD:** Invite the right people; grant least-privilege access; avoid accidental overshare; assign/track work on boards; transfer ownership ([Miro](https://help.miro.com/hc/en-us/articles/360017571194-Roles-in-Miro); [Notion](https://www.notion.com/help/guides/grant-access-teamspaces); [WorkOS](https://workos.com/blog/multi-tenant-permissions-slack-notion-linear); [Goh Discord admin](https://www.hannahgoh.com/home/discord-usability)).

**Alpha metrics:** Invite accept rate; role-assign task success; permission quiz accuracy (expected vs actual); time-to-first board task; overshare incidents; undo/fix success.

**Survey questions:**
1. Did you successfully invite a teammate? (Y/N)
2. Did you assign or change a role/permission? (Y/N)
3. “Role names matched what people could actually do.” (1–5)
4. After assigning a restricted role, did that person **only** see what you intended? (Y/N/Unsure)
5. “I could fix a mistaken permission without help.” (1–5)
6. Did you create or move a task/card on a board? (Y/N)
7. “I felt confident I was not oversharing sensitive content.” (1–5)
8. Compared with Notion/Miro/Google sharing, permission clarity was… (Much worse–Much better)
9. “Setting up my team took acceptable effort for an early product.” (1–5)
10. Would your team pay $X/user/mo for this admin+board layer? (Definitely–Definitely not)

---

#### 6) Contracts and workspaces (freelance contracts, project rooms, deliverables)
**JTBD:** Send clear scope/SOW; get signature; centralize files/feedback; approve deliverables; invoice/get paid with less leverage loss ([HoneyBook/Bonsai comparisons](https://www.g2.com/compare/bonsai-vs-honeybook); [Capterra Bonsai](https://www.capterra.com/p/238825/Bonsai/reviews/); escrow/dispute themes in [freelancer payment questionnaire](https://www.scribd.com/document/939657323/Freelancer-Questionnaire-Upwork-1)).

**Alpha metrics:** Contract send→sign success; time-to-signature; deliverable submit/approve success; payment-status comprehension; scope-clarity Likert; client portal task success.

**Survey questions:**
1. Did you create and send a contract/proposal/SOW? (Y/N)
2. Did the other party successfully sign (or sandbox-sign)? (Y/N)
3. “Scope, deliverables, and revision limits were clear.” (1–5)
4. Did you open a project workspace and share a file/deliverable? (Y/N)
5. Did you submit or approve a deliverable/milestone? (Y/N)
6. “I understood payment/milestone status at all times.” (1–5)
7. “This reduced back-and-forth vs email+PDF+Drive.” (1–5)
8. Compared with HoneyBook/Bonsai/DocuSign+Drive, the end-to-end flow was… (Much worse–Much better)
9. “I would trust this workspace for a real paid engagement.” (1–5)
10. Would you pay $X/mo (or Y% per contract) for this? (Y/N/Need info) — optionally add acceptable fee % ([TalentHub](https://www.enidlam.com/projects/talentHub/interviewQuestions.pdf))

### Gaps
- Concrete question banks above are **synthesized instruments** for Ensemble alpha, not verbatim published questionnaires from Frame.io/Upwork/Discord/etc.
- Psychometric reliability (Cronbach’s α) for these custom items was not established in sources; UMUX-Lite items are the exception with published validation ([CHI UMUX-LITE](https://dl.acm.org/doi/10.1145/2470654.2481287)).
- CapCut web and Premiere Team Projects specific published usability surveys were not found; video-collab guidance leans on Frame.io/Descript/CSCW literature.
- “Contracts & workspaces” academic UX survey batteries are sparse; evidence leans on SaaS review sites and marketplace trust research.

---

## Cross-cutting source quality notes

### Cited Findings
- Strongest primary research: Okopnyi et al. CSCW/NordiCHI collaborative video editing; Twente OLP trust vignette study; McEdwards Frame.io mixed-methods pilot; MJOC marketplace heuristic paper; MeasuringU psychometric work on UMUX-Lite.
- Strong practitioner/primary-adjacent: IDC sponsored Frame.io white paper (ROI claims are vendor-sponsored—use for JTBD framing, treat 870% ROI cautiously); Creative Market designer write-ups; Discourse meta usability notes.
- Weaker / secondary: SaaS blog survey templates (SurveyMars, Zonka, Hypothis, ValidateThat), portfolio heuristic evaluations of Discord, G2/Capterra review aggregates—useful for question wording and friction themes, not causal claims.

### Inferences
- For the final Ensemble alpha survey, prioritize **binary task success + 5-point Likert matrices + one relative competitor item + one soft WTP item** per feature area to keep stats comparable and alpha-appropriate.

### Gaps
- No single meta-analysis covering all six product categories’ alpha survey norms was found; triangulation across domains is required.
