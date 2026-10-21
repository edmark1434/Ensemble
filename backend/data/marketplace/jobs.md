# Jobs Marketplace & Discovery Ranking

Routes:
- Browse Jobs: `/jobs/postings`
- How Job Ranking Works: `/jobs/info`
- Post an Individual Job: `/jobs/postings/create`
- Post a Team Milestone Pool Job: `/jobs/postings/create-team`
- Choose Hiring Flow: `/jobs/postings/choose`
- Job Detail Standalone Page: `/jobs/postings/:id/page`
- Job Detail Slide-out Drawer: `/jobs/postings/:id`
- Edit Job Post: `/jobs/edit/:id` or `/jobs/edit-post/:id`
- Saved Jobs: `/jobs/saved-posts`
- My Job Posts: `/jobs/my-job-post`

Sources:
- `frontend/src/pages/user/6_job_market/job_ranking.ts`
- `frontend/src/pages/user/6_job_market/job_components/JobPostsInfoGuide.tsx`
- `frontend/src/pages/user/6_job_market/job_components/job_lists.tsx`
- `frontend/src/pages/user/6_job_market/job_components/job_viewdetails.tsx`
- `frontend/src/pages/user/6_job_market/job_pages/job_full_page.tsx`
- `frontend/src/pages/user/6_job_market/job_components/jobs_other_posts.tsx`
- `backend/repositories/JobRepositories.js`

---

## 1. Overview & Post Types

The Ensemble Job Market connects clients with video editors, motion graphics artists, colorists, and post-production specialists.

The marketplace supports 3 distinct job posting types:
1. **Individual — Open Bid (`individual_open`)**:
   - Client specifies a starting budget floor benchmark (e.g. `1,800+ Credits`).
   - Freelancers pitch their own custom pricing and milestones during proposal submission.
2. **Individual — Budget Range (`individual_ranged`)**:
   - Client sets a defined Min–Max budget bracket (e.g. `800 – 1,400 Credits`) for 1 or more individual seats.
   - Hired creators work on their own independent contracts.
3. **Team — Milestone Pool (`team_pool`)**:
   - Client defines a shared production pool (e.g. `8,000 Credits Pool`) split across structured milestone roles and seat counts.
   - Specialists apply for dedicated milestone tasks within a collaborative team production.

---

## 2. 100-Point Type-Aware Job Discovery Ranking Algorithm

Jobs are ranked automatically on browse and recommendation lists using a 100-point algorithm designed around fair play:

$$\text{Total Score} = \text{Trust Rating (35 pts)} + \text{14-Day Freshness (25 pts)} + \text{Brief Quality (25 pts)} + \text{Open Capacity (15 pts)}$$

### Pillar 1: Client Trust & Fair Baseline (35 Points Max)
- Uses Bayesian mean weighting:
  $$\text{Score} = \frac{C \cdot m + \sum \text{ratings}}{C + n} \times \frac{35}{5.0}$$
  where $m = 4.2$ (prior mean) and $C = 3$ (confidence weight).
- **New Client Protection**: Brand-new clients with 0 reviews start at a fair **4.2★ baseline (29.4 / 35 pts)**. A first-time client with a great project is never buried beneath established accounts.

### Pillar 2: 14-Day New Job Spotlight (25 Points Max)
- Fresh job postings published within the last 7 days receive the full 25 points if they have fewer than 3 proposals per seat.
- Tapers smoothly to 0 after 14 days or as proposal volume builds up.

### Pillar 3: Type-Aware Brief Quality Checklist (25 Points Max)
Each job type is scored against its own tailored checklist:

| Job Type | Criteria & Points | Requirements |
|---|---|---|
| **Individual — Open Bid** | Scope of Work (+30%)<br>Realistic Floor (+20%)<br>Skill Tags (+20%)<br>Visual Cover (+15%)<br>Timeline & Terms (+15%) | 150+ character description.<br>Minimum budget ≥ 300 Credits.<br>At least 3 relevant skill tags.<br>Uploaded custom cover visual or reference brief.<br>Timeline & Portfolio/NDA workflow settings selected. |
| **Individual — Budget Range** | Deliverables Scope (+25%)<br>Focused Spread (+25%)<br>Skill Tags (+15%)<br>Visual Cover (+15%)<br>Timeline & Screening (+20%) | 140+ character deliverables explanation.<br>Max budget within 3x of Min budget.<br>At least 3 relevant skill tags.<br>Custom thumbnail or attachments.<br>Timeline specified + screening questions or milestones. |
| **Team — Milestone Pool** | Structured Milestones (+30%)<br>Milestone Checklists (+20%)<br>Production Brief (+20%)<br>Multi-Disciplinary Skills (+15%)<br>Cover & Schedule (+15%) | 2+ milestone phases with credit % and seat counts.<br>Specific task checklist inside each milestone.<br>140+ character production overview.<br>3+ skill tags covering required specialist roles.<br>Custom cover visual and delivery timeline. |

### Pillar 4: Seat-Aware Open Capacity (15 Points Max)
- Evaluates congestion as $\frac{\text{Proposals}}{\text{Open Seats}}$.
- A 5-seat Team Job with 5 proposals has a ratio of 1.0 (not crowded).
- When a 1-seat job reaches 15+ proposals (or all seats are hired), its score steps back so jobs still needing applicants stay in the top discovery rows.

---

## 3. The Green "Rising" Badge

The green **Rising** badge (`TrendingUp` icon + light-sweep shine animation) is awarded to high-potential new job postings:
- **Qualification Criteria**:
  1. Published within the last **7 days** ($\le 7\text{ days}$).
  2. Fewer than **3 proposals per open seat**.
  3. Client has **0 prior platform reviews**.
  4. Achieves at least **85% Brief Quality Score** on its type checklist.
- Clicking the badge takes users to the `/jobs/info` guide.

---

## 4. Job Card Badges & Indicators

- **Status (`Open` / `Closed`)**: Green badge indicating whether unfilled hiring seats are accepting proposals.
- **Hiring Type (`Individual` / `Team Project`)**: Placed at the bottom-left of the thumbnail with the `difficulty` tag (`Beginner`, `Intermediate`, `Expert`).
- **Owner Score Breakdown Card**: Job owners can expand a neutral gray collapsible panel on their own post to inspect their live score breakdown across the 4 pillars.
