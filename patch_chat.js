const fs = require('fs');
const file = 'components/sadeem/chat-view.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file was already partially patched by sed, let's make sure it's correct
content = content.replace(/activeChatId/g, 'activeChat?.id');

fs.writeFileSync(file, content);
