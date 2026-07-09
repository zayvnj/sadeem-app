const fs = require('fs');
const file = 'components/sadeem/chat-view.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/staleTime: 60000,/g, "staleTime: 60000,\n    networkMode: 'offlineFirst',");

fs.writeFileSync(file, content);
