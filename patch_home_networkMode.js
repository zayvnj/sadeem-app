const fs = require('fs');
const file = 'components/sadeem/home-feed.tsx';
let content = fs.readFileSync(file, 'utf8');

// The provider handles `offlineFirst` automatically if persister is set according to tanstack query v5 docs,
// But to ensure it's explicitly set for our feed queries when offline, we can add networkMode: 'offlineFirst' just to be safe.
content = content.replace(/staleTime: 60000,/g, "staleTime: 60000,\n    networkMode: 'offlineFirst',");
content = content.replace(/staleTime: 120000,/g, "staleTime: 120000,\n    networkMode: 'offlineFirst',"); // just in case
content = content.replace(/getNextPageParam:/g, "networkMode: 'offlineFirst',\n    getNextPageParam:");


fs.writeFileSync(file, content);
