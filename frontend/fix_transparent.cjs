const fs = require('fs');

const files = [
  'src/pages/setup_account/01_PersonalDetails.tsx',
  'src/pages/setup_account/02_UploadImage.tsx',
];

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/"transparent"Input/g, '"transparent"');
  fs.writeFileSync(file, c, 'utf8');
}
console.log('Fixed transparentInput');
