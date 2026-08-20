const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../../frontend/src/pages/user/7_gigs/gig_pages/gig_edit_page.tsx');
let c = fs.readFileSync(file, 'utf8');

const badBlock = `  useEffect(() => {
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
  }`;

c = c.replace(badBlock, '');
// there may be extra newlines left but that's fine.

const target = '  const hasUnsavedChanges = Boolean(title || description || category);';
c = c.replace(target, badBlock + '\n\n' + target);

fs.writeFileSync(file, c);
console.log('Fixed hook order');
