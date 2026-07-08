const fs = require('fs');
const file = 'components/sadeem/home-feed.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/    staleTime: 60000,\n    networkMode: 'offlineFirst',/g, "    staleTime: 60000,");

fs.writeFileSync(file, content);
