const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_pages/gig_create_page.tsx', 'utf8');

const oldStep1 = `      if (currentSlide === 1 && targetSlide === 2) {
        const stepErrors: Record<string, string> = {};
        if (!title.trim()) stepErrors.title = "Service title is required";
        if (!description.trim()) stepErrors.description = "Service description is required";
        if (!category) stepErrors.category = "Category is required";
        if (!thumbnailFile) stepErrors.thumbnail = "Thumbnail image is required";

        if (Object.keys(stepErrors).length > 0) {`;

const newStep1 = `      if (currentSlide === 1 && targetSlide === 2) {
        const stepErrors: Record<string, string> = {};
        if (!title.trim()) stepErrors.title = "Service title is required";
        if (!description.trim()) stepErrors.description = "Service description is required";
        if (!category) stepErrors.category = "Category is required";
        if (!thumbnailFile) stepErrors.thumbnail = "Thumbnail image is required";
        if (skills.length === 0) stepErrors.skills = "At least 1 skill is required";

        if (Object.keys(stepErrors).length > 0) {`;

code = code.replace(oldStep1, newStep1);

const oldStep2 = `      if (currentSlide === 2 && targetSlide === 3) {
        const stepErrors: Record<string, string> = {};
        if (skills.length === 0) stepErrors.skills = "At least 1 skill is required";
        if (!firstDraftDelivery) stepErrors.firstDraftDelivery = "Timeline is required";
        if (!termsOfService.trim()) stepErrors.termsOfService = "Terms of service are required";
        if (galleryFiles.length === 0) stepErrors.galleryUrls = "At least 1 supporting picture is required";`;

const newStep2 = `      if (currentSlide === 2 && targetSlide === 3) {
        const stepErrors: Record<string, string> = {};
        if (!firstDraftDelivery) stepErrors.firstDraftDelivery = "Timeline is required";
        if (!termsOfService.trim()) stepErrors.termsOfService = "Terms of service are required";
        if (galleryFiles.length === 0) stepErrors.galleryUrls = "At least 1 supporting picture is required";`;

code = code.replace(oldStep2, newStep2);

fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_pages/gig_create_page.tsx', code);
