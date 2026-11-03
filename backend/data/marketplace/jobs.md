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

The marketplace supports:
1. **Budget Range (`budget_range`)**:
   - Client sets a defined Min–Max budget bracket (e.g. `800 – 1,400 Credits`) for 1 or more hiring seats.
2. **Open Bid (`open_bid`)**:
   - Client specifies a starting budget floor benchmark (e.g. `1,800+ Credits`) with no upper cap.
   - Freelancers and teams pitch their own custom pricing and milestone roadmaps during proposal submission.

---

## 2. 100-Point Type-Aware Job Discovery Ranking: Score Basis & Actionability

Jobs are evaluated on a 100-point algorithm structured into **3 Actionability Groups** across 13 transparent signals:

$$\text{Total Score} = \min(100, \text{Job Post Content (25 pts)} + \text{Account Profile (35 pts)} + \text{Live Market Signals (40 pts)} + \text{Subscription Profile Boost (up to +9.0 pts)})$$

### Group 1: Job Post Content (You Control — Editable Anytime)
*These scores are calculated directly from your job post details. You can improve them anytime by clicking **Edit Post** on your listing.*

| Scoring Factor | Max Impact | Percentage | Can It Be Changed? | Calculation & Rule |
|---|---|---|---|---|
| **Proper Title & Scope Description** | `7.50 pts` | `7.50%` | **Editable Anytime** | Title is 15–100 chars with 3+ words (`+2.50 pts`); Scope has 150+ chars of HTML-stripped plain-text deliverables (`+5.00 pts`). |
| **Budget Realism & Focused Spread** | `6.25 pts` | `6.25%` | **Editable Anytime** | Open Bid floor ≥ 300 Credits; or Budget Range (Min ≥ 250 Credits) where Max ≤ 3x Min. |
| **True Custom Thumbnail & Brief Files** | `5.00 pts` | `5.00%` | **Editable Anytime** | Uses an uploaded custom image or attached brief PDFs (preset default `/job_banners/` banners do not qualify). |
| **Skill Tag Specificity & Match** | `3.75 pts` *(+2.0 bonus)* | `3.75%` *(+2.0% bonus)* | **Editable Anytime** | At least 3 relevant tags (e.g. `Color Grading`, `Blender`); plus up to `+2.0 pts` match bonus when matching the browsing freelancer's profile skills. |
| **Timeline, Workflow Terms & Milestones** | `2.50 pts` | `2.50%` | **Editable Anytime** | Turnaround timeline specified plus NDA / Portfolio workflow rules, screening questions, or milestone roadmaps. |

### Group 2: Poster Account Standing (Your Platform Profile & Plan)
*These scores are derived from your account profile, contract history, and active membership tier.*

| Scoring Factor | Max Impact | Percentage | Can It Be Changed? | Calculation & Rule |
|---|---|---|---|---|
| **Bayesian Client Star Rating** | `22.75 pts` | `22.75%` | **Dynamic (Account)** | $\frac{C \cdot m + v \cdot R}{C + v}$ with prior mean $m = 4.2\star$ and confidence weight $C = 3$. Brand-new clients with 0 reviews start at a fair **4.2★ baseline**. |
| **Client Platform Merit Score** | `7.70 pts` | `7.70%` | **Dynamic (Account)** | Computed as `clamp(100 - active_warning_points, 0, 100)`. Trusted (100) clients receive full points; warned accounts step back. |
| **Historical Hire Rate** | `4.55 pts` | `4.55%` | **Dynamic (Account)** | Percentage of published jobs that resulted in a hire (`hired / total`). New clients start at a 100% baseline. |
| **Subscription Profile Visibility Boost** | `Up to +9.0 pts` | `Up to +9.0%` | **Dynamic (Account)** | Direct boost from active membership: **Business** (`+9.0 pts` from +90 visibility), **Premium** (`+3.0 pts` from +30 visibility), **Free** (`+0.0 pts`). |

### Group 3: Live Community & Market Signals (Real-Time Dynamics)
*These scores update automatically as creators browse, bookmark, and apply to your post.*

| Scoring Factor | Max Impact | Percentage | Can It Be Changed? | Calculation & Rule |
|---|---|---|---|---|
| **Dynamic Window Freshness** | `19.50 pts` | `19.50%` | **Dynamic (Live Market)** | Adapts dynamically to the job's chosen window (`12h`, `24h`, `3d`, `7d`, or `14d`). Starts at 90–100% and rebounds in final 25% if proposals < 3. |
| **Low Proposal Congestion** | `15.00 pts` | `15.00%` | **Dynamic (Live Market)** | Prioritizes posts with 0–2 proposals per open seat (`proposals / openSeats`) so unfilled listings get discovered first. |
| **Community Saves Count** | `3.75 pts` | `3.75%` | **Dynamic (Live Market)** | Logarithmic boost from freelancer bookmarks (saturating at 5+ saves; owner's own save excluded). |
| **Last-Call Urgency Spotlight** | `1.75 pts` | `1.75%` | **Dynamic (Live Market)** | Last-call boost when `< 24h` (or `< 25%`) remains on `applicationDeadline` and the job has `< 3` proposals per open seat. |

---

### Score-Weighted Random Sampling on Feed Refresh
To prevent a frozen "rich-get-richer" feed while still rewarding top-scoring jobs, `/jobs/postings` computes a `discoveryOrderKey` on each page load/refresh:
- Anchored to `totalScore` + a `+3.5 pt` lift for `0-proposal` jobs + bell-shaped random jitter (`±14 pts`).
- High-scoring jobs (`80–100 pts`) have a significantly higher probability of landing in the top rows on every refresh, while mid-tier jobs still rotate into top discovery positions fairly.
- **Alt + O Dev Mode**: Pressing `Alt + O` displays the exact Algo Score, Discovery Roll Key, and Subscription Boost badge directly on every job card thumbnail.

---

## 3. The Green "Rising" Badge

The green **Rising** badge (`TrendingUp` icon + light-sweep shine animation) is awarded to high-potential new job postings:
- **Qualification Criteria**:
  1. Published within the last **7 days** ($\le 7\text{ days}$).
  2. Fewer than **3 proposals per open seat**.
  3. Client has **0 prior platform reviews** and **Platform Merit ≥ 95**.
  4. Achieves at least **85% Brief Quality Score** on Pillar 3.
- Clicking the badge takes users to the `/jobs/info` guide.
