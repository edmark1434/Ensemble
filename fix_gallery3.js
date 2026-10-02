const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/6_create_review.tsx', 'utf8');

const oldGrid = `<div className="grid grid-cols-2 gap-2 h-32 md:h-40 w-full max-w-sm">
                    {galleryUrls.length > 0 && (
                      <div className="col-span-1 h-full">`;

const newGrid = `<div className="grid grid-cols-2 gap-2 w-full">
                    {galleryUrls.length > 0 && (
                      <div className="col-span-1 aspect-video">`;

code = code.replace(oldGrid, newGrid);

fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/6_create_review.tsx', code);
