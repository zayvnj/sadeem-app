const fs = require('fs');
const file = 'components/sadeem/home-feed.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file still doesn't have networkMode offlineFirst for the stories and reels query.
content = content.replace(/staleTime: 60000,/g, "staleTime: 60000,\n    networkMode: 'offlineFirst',");

fs.writeFileSync(file, content);
