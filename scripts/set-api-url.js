const fs = require('fs');
const url = process.env.API_URL || 'https://api.luxuryservice.co/api';
fs.writeFileSync(
  'src/environments/environment.prod.ts',
  `export const environment = {\n  production: true,\n  apiUrl: '${url}'\n};\n`
);
