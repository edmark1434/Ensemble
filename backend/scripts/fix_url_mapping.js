const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../../frontend/src/pages/user/7_gigs/gig_pages/gig_edit_page.tsx');
let c = fs.readFileSync(file, 'utf8');

const replacement = `    const fetchGig = async () => {
      try {
        const res = await api.get(\`/api/gigs/\${id}\`);
        const data = res.data.data;
        if (data) {
          const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || '';
          const mapUrl = (path: string) => {
            if (!path) return "";
            if (!cloudFrontUrl && path.includes('public')) return "";
            if (path.startsWith('http') || path.startsWith('/')) return path;
            return \`\${cloudFrontUrl}/\${path}\`;
          };

          setTitle(data.title || "");
          setDescription(data.description || "");
          setCategory(data.category || "");
          setThumbnailUrl(mapUrl(data.thumbnail) || "");
          setSlots(data.slots || 1);
          setTermsOfService(data.termsOfService || "");
          setSkills(data.skills || []);
          setFirstDraftDelivery(data.firstDraftDelivery || "");
          if (data.gallery) {
            setGalleryUrls(data.gallery.map((p: string) => mapUrl(p)).filter(Boolean));
          }
          if (data.tiers) setTiers(data.tiers);
          if (data.milestones) setMilestones(data.milestones);
          if (data.questionnaires) setQuestionnaires(data.questionnaires);
        }
      } catch (err) {
        console.error("Failed to fetch gig details:", err);
      } finally {
        setIsLoading(false);
      }
    };`;

const target = `    const fetchGig = async () => {
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
    };`;

c = c.replace(target, replacement);
fs.writeFileSync(file, c);
console.log('Fixed URL mapping');
