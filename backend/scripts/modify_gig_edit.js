const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../../frontend/src/pages/user/7_gigs/gig_pages/gig_edit_page.tsx');
let c = fs.readFileSync(file, 'utf8');

c = c.replace('import React, { useState } from "react";', 'import React, { useState, useEffect } from "react";');
c = c.replace('import { useNavigate } from "react-router-dom";', 'import { useNavigate, useParams } from "react-router-dom";');
c = c.replace('const GigCreatePage: React.FC = () => {', 'const GigEditPage: React.FC = () => {\n  const { id } = useParams();\n  const [isLoading, setIsLoading] = useState(true);');
c = c.replace('export default GigCreatePage;', 'export default GigEditPage;');
c = c.replace('api.post("/api/gigs", gigPayload)', 'api.put(`/api/gigs/${id}`, gigPayload)');

const fetchLogic = `
  useEffect(() => {
    const fetchGig = async () => {
      try {
        const res = await api.get(\`/api/gigs/\${id}\`);
        const data = res.data.data;
        if (data) {
          setTitle(data.title || "");
          setDescription(data.description || "");
          setCategory(data.category || "");
          setThumbnailUrl(data.thumbnail || "");
          setSlots(data.slots || 1);
          setTermsOfService(data.termsOfService || "");
          setSkills(data.skills || []);
          setFirstDraftDelivery(data.firstDraftDelivery || "");
          if (data.gallery) setGalleryUrls(data.gallery);
          if (data.tiers) setTiers(data.tiers);
          if (data.milestones) setMilestones(data.milestones);
          if (data.questionnaires) setQuestionnaires(data.questionnaires);
        }
      } catch (err) {
        console.error("Failed to fetch gig details:", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchGig();
  }, [id]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center dark:bg-dark-base text-gray-500">Loading service details...</div>;
  }
`;

c = c.replace('// --- SLIDE 1: CORE INFO ---', fetchLogic + '\n  // --- SLIDE 1: CORE INFO ---');

fs.writeFileSync(file, c);
console.log('Modified gig_edit_page.tsx');
