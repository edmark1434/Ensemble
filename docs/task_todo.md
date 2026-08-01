# Jobs Market - Task To Do

## ⚙️ Backend Implementation

- [ ] **Job Repositories** (`JobRepositories.js`)
  - [ ] Implement job queries (Create, Read, Update/Edit)
  - [ ] Implement proposal queries (Create, Read, Update/Edit)
- [ ] **Job Services** (`JobServices.js`)
  - [ ] Business logic for job and proposal validation
  - [ ] Handle permissions for editing jobs/proposals
- [ ] **Job Controllers** (`JobControllers.js`)
  - [ ] Request/Response handling for jobs and proposals
- [ ] **Job Routes** (`backend/Route/job.js`)
  - [ ] Define endpoints (GET/POST/PUT) and integrate into `api.js`
- [ ] **Job Post APIs**
  - [ ] Implement Create Job Post
  - [ ] Implement Fetch/Display Job Posts
  - [ ] Implement Edit Job Post (allow users to update their own jobs)
- [ ] **Proposal APIs**
  - [ ] Implement Send Proposal
  - [ ] Implement Fetch/Display Proposals (Client POV & Freelancer POV)
  - [ ] Implement Edit Proposal (allow users to update their sent proposals)
- [ ] **AWS S3 Integration**
  - [ ] Utilize existing `fileControllers.js` to generate pre-signed upload URLs for job/proposal attachments.
  - [ ] Store only the returned S3 object key in the Jobs/Proposals database.

---

## 🎨 Frontend Implementation

- [ ] **Data Hooks/Services**
  - [ ] Create reusable API utility functions/hooks (`useJobs.ts`, etc.)
- [ ] **Job Listings**
  - [ ] Update `job_main.tsx` to fetch jobs dynamically from the backend (replacing `sampleJobs`)
- [ ] **Job Posting & Editing**
  - [ ] Connect the Create Job form to the backend
  - [ ] Add "Edit Job" functionality allowing users to edit their posted jobs
  - [ ] Integrate AWS S3 file upload flow (using existing pre-signed URL approach) for job attachments/images.
- [ ] **Job Proposals & Editing**
  - [ ] Connect the Send Proposal form to the backend
  - [ ] Add "Edit Proposal" functionality allowing freelancers to update their proposals
- [ ] **Proposal Views**
  - [ ] Connect Client POV to display received proposals
  - [ ] Connect Freelancer POV to display sent proposals
- [ ] **UI/UX Rules**
  - [ ] Ensure all existing UI designs, CSS, and styling remain untouched
  - [ ] Reuse existing upload logic (as referenced in `CreateGroupModal.tsx`) instead of creating a new one
