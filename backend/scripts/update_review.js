const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/6_create_review.tsx', 'utf8');

content = content.replace(
  'import { ArrowLeft, CheckCircle2, Rocket, Calendar, MapPin, Tag, Box, Layers, DollarSign } from "lucide-react";',
  'import { ArrowLeft, CheckCircle2, Rocket, Calendar, MapPin, Tag, Box, Layers, DollarSign, Edit2 } from "lucide-react";'
);

content = content.replace(
  'onSubmit: () => Promise<void> | void;\n}',
  'onSubmit: () => Promise<void> | void;\n  onEdit?: (step: number) => void;\n}'
);

content = content.replace(
  'onBack,\n  onSubmit,\n}) => {',
  'onBack,\n  onSubmit,\n  onEdit,\n}) => {'
);

const editBtn = (step) => `
            {onEdit && (
              <button onClick={() => onEdit(${step})} className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors ml-2" title="Edit section">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}`;

content = content.replace(
  'pb-2">Core Information</h3>',
  `pb-2 flex justify-between items-center">
            <div className="flex items-center">
              <span>Core Information</span>${editBtn(1)}
            </div>
          </h3>`
);

content = content.replace(
  'pb-2 flex items-center justify-between">\n              <span>Pricing Tiers</span>\n              <span className="bg-blue-100',
  `pb-2 flex items-center justify-between">
              <div className="flex items-center">
                <span>Pricing Tiers</span>${editBtn(3)}
              </div>
              <span className="bg-blue-100`
);

content = content.replace(
  'pb-2 flex justify-between">\n                <span>Project Milestones</span>',
  `pb-2 flex justify-between items-center">
                <div className="flex items-center">
                  <span>Project Milestones</span>${editBtn(4)}
                </div>`
);

content = content.replace(
  'pb-2 flex justify-between">\n              <span>Client Requirements</span>',
  `pb-2 flex justify-between items-center">
              <div className="flex items-center">
                <span>Client Requirements</span>${editBtn(5)}
              </div>`
);

fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/6_create_review.tsx', content);
