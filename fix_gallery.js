const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/6_create_review.tsx', 'utf8');

const oldGallery = `<div className="flex flex-wrap gap-2">
                    {galleryUrls.map((url, idx) => (
                      <img key={idx} src={url} alt={"Gallery " + idx} className="w-20 md:w-24 aspect-video rounded-lg object-cover border border-gray-200 dark:border-white/10" />
                    ))}
                  </div>`;

const newGallery = `<div className="grid grid-cols-2 gap-2 h-32 md:h-40">
                    {galleryUrls.length > 0 && (
                      <div className="col-span-1 h-full">
                        <img src={galleryUrls[0]} alt="Gallery Main" className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-white/10 shadow-sm" />
                      </div>
                    )}
                    {galleryUrls.length > 1 && (
                      <div className="col-span-1 grid grid-cols-2 grid-rows-2 gap-2 h-full">
                        {galleryUrls.slice(1, 5).map((url, idx) => (
                          <img key={idx} src={url} alt={"Gallery " + (idx + 1)} className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-white/10 shadow-sm" />
                        ))}
                      </div>
                    )}
                  </div>`;

if (code.includes(oldGallery)) {
    code = code.replace(oldGallery, newGallery);
    fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/6_create_review.tsx', code);
    console.log("Successfully replaced");
} else {
    console.log("Could not find the exact gallery block to replace.");
}
