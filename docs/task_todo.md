# Jobs Market - Task To Do

## 🏗️ Phase 1: Database Migrations
*We will align the database exactly with the requested frontend fields before writing any backend logic.*

- [x] **Create `terms_of_service` Table**
  - [x] Fields: `terms_id` (PK), `terms_title`, `terms_description`, `terms_type` (e.g., jobs/gigs), `created_at`.
- [x] **Alter `jobs` Table (Add Missing Columns)**
  - [x] Add `category` (varchar)
  - [x] Add `posted_as` (varchar - 'Self' or 'Team')
  - [x] Add `team_id` (uuid, nullable, FK to `teams`)
  - [x] Add `timeline_min` (integer)
  - [x] Add `timeline_max` (integer)
- [x] **Alter `proposals` Table (Add Missing Columns)**
  - [x] Add `terms_id` (uuid, FK to `terms_of_service`)
  - [x] Add `reject_reason` (varchar)

---

## ⚙️ Phase 2: Backend Implementation
*Once the database matches the frontend, we build the API.*

- [x] **Job Repositories** (`JobRepositories.js`)
  - [x] Implement job queries (Create, Read, Update/Edit)
  - [x] Implement proposal queries (Create, Read, Update/Edit)
- [x] **Job Services** (`JobServices.js`)
  - [x] Business logic for job and proposal validation
  - [x] Handle permissions for editing jobs/proposals
- [x] **Job Controllers** (`JobControllers.js`)
  - [x] Request/Response handling for jobs and proposals
- [x] **Job Routes** (`backend/Route/job.js`)
  - [x] Define endpoints (GET/POST/PUT) and integrate into `api.js`
- [x] **AWS S3 Integration**
  - [x] Utilize existing `fileControllers.js` to generate pre-signed upload URLs for job/proposal attachments.
  - [x] Store only the returned S3 object key in the Jobs/Proposals database.

---

## 🎨 Phase 3: Frontend Implementation
*Connect the UI to our newly built, perfectly aligned API.*

- [ ] **Data Hooks/Services**
  - [ ] Create reusable API utility functions/hooks (`useJobs.ts`, etc.)
- [ ] **Job Listings**
  - [ ] Update `job_main.tsx` to fetch jobs dynamically from the backend (replacing `sampleJobs`)
- [ ] **Job Posting & Editing**
  - [ ] Connect the Create Job form to the backend (mapping all frontend fields)
  - [ ] Add "Edit Job" functionality allowing users to edit their posted jobs
  - [ ] Integrate AWS S3 file upload flow for job attachments/thumbnails.
- [ ] **Job Proposals & Editing**
  - [ ] Connect the Send Proposal form to the backend
  - [ ] Add "Edit Proposal" functionality allowing freelancers to update their proposals
- [ ] **Proposal Views**
  - [ ] Connect Client POV to display received proposals (`/proposals/incoming/post-id`)
  - [ ] Connect Freelancer POV to display sent proposals (`/jobs/proposals/sent`)
- [ ] **UI/UX Rules**
  - [ ] Ensure all existing UI designs, CSS, and styling remain untouched
  - [ ] Reuse existing upload logic (as referenced in `CreateGroupModal.tsx`) instead of creating a new one
