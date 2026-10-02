const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_pages/gig_create_page.tsx', 'utf8');

const oldMilestones = `const [milestones, setMilestones] = useState<Milestone[]>([{ name: "Kickoff", description: "Initial setup and requirements gathering." }]);`;
const newMilestones = `const [milestones, setMilestones] = useState<Milestone[]>([
    { id: "m1", name: "Phase 1: Discovery & Planning", description: "Initial setup, gathering requirements, and outlining the project scope." },
    { id: "m2", name: "Phase 2: Core Development", description: "Executing the main deliverables and providing a first draft for review." },
    { id: "m3", name: "Phase 3: Final Revisions & Handover", description: "Applying feedback and delivering the final source files." }
  ]);`;

code = code.replace(oldMilestones, newMilestones);
fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_pages/gig_create_page.tsx', code);
