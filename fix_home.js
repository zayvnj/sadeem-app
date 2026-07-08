const fs = require('fs');
const file = 'components/sadeem/home-feed.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix typing issues introduced in my patch
content = content.replace(
  /const currentUserStoryGroup = currentUserStoriesIndex >= 0 \? stories\[currentUserStoriesIndex\] : null/,
  'const currentUserStoryGroup: any = currentUserStoriesIndex >= 0 ? stories[currentUserStoriesIndex] : null'
);

fs.writeFileSync(file, content);
