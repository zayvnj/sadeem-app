const fs = require('fs');
const file = 'components/sadeem/home-feed.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/    networkMode: 'offlineFirst',\n    networkMode: 'offlineFirst',/g, "    networkMode: 'offlineFirst',");

fs.writeFileSync(file, content);
