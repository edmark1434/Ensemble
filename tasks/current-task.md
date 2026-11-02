# Active Task: Improve Landing Subpages with Architectural Blueprint Layout

## Objective

Apply the Landing Page architectural/blueprint grid layout (`1320px` structural container, `1px` crisp cell borders, `0px` border-radius, `+` corner crosshairs, top telemetry bar, high-contrast crisp and visible texts, `#121214` dark mode / `#ffffff` light mode, `Plus Jakarta Sans` + monospace telemetry labels, and accurate Ensemble platform terminology) to the landing subpages:
- `/landing/usecase/client`, `/landing/usecase/freelancer`, `/landing/usecase/asset-creator`, `/landing/usecase/enthusiast` (`frontend/src/pages/landing/pages/page_Usecase.tsx`)
- `/landing/HowToHire` (`frontend/src/pages/landing/pages/page_HowToHire.tsx`)
- `/landing/HowToWork` (`frontend/src/pages/landing/pages/page_HowToWork.tsx`)
- `/landing/AboutUs` (`frontend/src/pages/landing/pages/page_AboutUs.tsx`)
- `/landing/TermsOfService` (`frontend/src/pages/landing/pages/page_TermsOfService.tsx`)
- `/landing/PrivacyPolicy` (`frontend/src/pages/landing/pages/page_PrivacyPolicy.tsx`)

## Acceptance criteria

- All 6 landing subpage files use the same crisp architectural blueprint frame (`#121214` dark / `#ffffff` light, `1px` structural borders, `0px` border-radius, `+` corner crosshairs, high-contrast readable typography).
- `page_Usecase.tsx`: Accurate Ensemble terminology (Client & Freelancers 2-way hiring via Job Proposals or Discovery / Gigs & Services orders -> Offer Contract -> Hire; Asset Creators selling Template Videos, Bundles, Images, Videos, and Audios on the Asset Marketplace / Asset Library; Unified Account + KYC verification).
- `page_HowToHire.tsx` & `page_HowToWork.tsx`: Accurate KYC prerequisite banner, 2-way hiring (Jobs vs. Discovery / Gigs & Services) and 3-way working (Gigs & Services, Job Proposals, Asset Marketplace / Asset Library for Template Videos, Bundles, Images, Videos, and Audios).
- `page_AboutUs.tsx`: Blueprint-framed RavenLabs studio header + 4-column interactive 3D flip cards for the 4 Core Architects with high-contrast readable text on both front and back faces.
- `page_TermsOfService.tsx` & `page_PrivacyPolicy.tsx`: Blueprint-framed 2-column legal layout (sticky index rail on left + crisp high-contrast clause cells on right).
- Verify `cd frontend && npm run build` passes cleanly.
