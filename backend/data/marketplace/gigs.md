# Services (Gigs) Marketplace & Discovery Ranking

Routes:
- Browse Services: `/gigs/services`
- How Services Ranking Works: `/gigs/info`
- Create a Service: `/gigs/create`
- Edit a Service: `/gigs/edit/:id`
- Service Detail Standalone Page: `/gigs/services/:id/page`
- Service Detail Slide-out Drawer: `/gigs/services/:id`
- Order a Service: `/gigs/services/:id/order`
- Sent Gig Orders: `/gigs/orders/sent`
- Sent Order Details: `/gigs/orders/sent/:orderId`
- Incoming Gig Orders (Freelancer Dashboard): `/gigs/orders/incoming`
- Incoming Order Details: `/gigs/orders/incoming/:orderId`
- Saved Services: `/gigs/saved-services`
- My Services: `/gigs/my-services`

Sources:
- `frontend/src/pages/user/7_gigs/gig_ranking.ts`
- `frontend/src/pages/user/7_gigs/gig_components/GigServicesInfoGuide.tsx`
- `frontend/src/pages/user/7_gigs/gig_components/gig_lists.tsx`
- `frontend/src/pages/user/7_gigs/gig_components/GigViewDetails.tsx`
- `frontend/src/pages/user/7_gigs/gig_components/GigRichText.tsx`
- `frontend/src/pages/user/7_gigs/gig_components/gigs_other_services.tsx`
- `backend/repositories/GigRepositories.js`

---

## 1. Overview & Service Structure

Ensemble Services (Gigs) allow freelancers and creative teams to package predefined video editing, motion design, 3D modeling, and post-production offerings with clear pricing and delivery expectations.

Key components of every service:
- **3 Pricing Tiers**: Basic, Standard, and Premium packages with distinct scope, delivery turnaround (days), revisions, and credit pricing.
- **Project Milestones**: Structured production phases (e.g. Rough Cut, Sound & Color Polish, Final Master).
- **Service Terms & Deliverables**: Clear expectations, revision policies, and additional work markup rates.
- **Client Questionnaire**: Pre-order requirement forms (text, file upload, or multiple choice) required before an order enters escrow.
- **Queue Slots**: Creator-defined concurrent order limits to ensure realistic delivery schedules.

---

## 2. 100-Point Fair Discovery Ranking Algorithm

All services on browse lists, search, and "Top Services" are ranked using a 100-point algorithm that balances verified trust with fair opportunity for new creators:

$$\text{Total Score} = \text{Trust Rating (40 pts)} + \text{14-Day Freshness (25 pts)} + \text{Service Completeness (20 pts)} + \text{Queue Availability (15 pts)}$$

### Pillar 1: Fair Trust Rating (40 Points Max)
- Uses Bayesian mean weighting:
  $$\text{Score} = \frac{C \cdot m + \sum \text{ratings}}{C + n} \times \frac{40}{5.0}$$
  where $m = 4.2$ (prior mean) and $C = 3$ (confidence weight).
- **Newcomer Protection**: Brand-new creators with 0 reviews start at a fair **4.2★ baseline (33.6 / 40 pts)**. They are not penalized for having zero completed escrow orders on Day 1.

### Pillar 2: 14-Day Newcomer Spotlight (25 Points Max)
- Brand-new services published within the last 7 days receive the full 25 points.
- The boost gently tapers over 14 days as the creator acquires real orders and review ratings.

### Pillar 3: Service Completeness & Effort (20 Points Max)
Creators control 100% of this pillar on Day 1 by following the completeness checklist:

| Setup Item | Score | Requirement |
|---|---|---|
| **Offer All 3 Pricing Tiers** | +25% | Define Basic, Standard, and Premium packages with realistic pricing and turnaround times. |
| **Upload 3+ Gallery Samples** | +25% | Include high-resolution thumbnails, video reel previews, or before/after stills. |
| **Define 3+ Project Milestones** | +20% | Break project workflow into sequential milestone phases. |
| **Detailed Description & Terms** | +15% | Description $\ge 120$ characters plus explicit Terms of Service. |
| **Add 3+ Relevant Skill Tags** | +15% | Tag specialized software/skills (e.g. After Effects, Blender, Sound Design). |

### Pillar 4: Queue Capacity & Availability (15 Points Max)
- Measures: $1.0 - \frac{\text{Active Orders}}{\text{Total Slots}}$.
- When a busy creator's active order queue is full, their listing steps back slightly to prevent burnout, allowing available creators with open hands to be discovered.

---

## 3. The Green "Rising" Badge

The green **Rising** badge (`TrendingUp` icon + light-sweep shine animation) highlights top-effort new creators:
- **Qualification Criteria**:
  1. Service published within the last **7 days** ($\le 7\text{ days}$).
  2. Fewer than **3 orders completed**.
  3. **0 client reviews** recorded yet.
  4. Service Completeness Score $\ge 85\%$.
- Clicking the badge navigates users to `/gigs/info`.

---

## 4. Service Card Badges & Indicators

- **`{tiers.length} Tiers`**: Located at the bottom-left of the thumbnail with the `Layers` icon.
- **Rating Pill**: Displays on the top-left of the thumbnail. Shows `"New"` for fresh listings with 0 reviews; otherwise displays verified client rating (e.g. `★ 5.0 (12)`).
- **`{ordersCount} Orders`**: Indicates total completed buyer orders.
- **`Open` / `Closed` Status**: Shows whether creator slots are available for new orders.
- **Owner Score Breakdown Card**: Visible only to the service creator (`isOwnGig`); an expandable collapsible card revealing their live score and completeness metrics.
