const fs = require('fs');
const file = 'components/sadeem/home-feed.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace any trailing duplicated networkMode in the infinite query.
content = content.replace(/    networkMode: 'offlineFirst',\n    getNextPageParam/g, "    getNextPageParam");

fs.writeFileSync(file, content);
