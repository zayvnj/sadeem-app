const fs = require('fs');
const file = 'components/sadeem/home-feed.tsx';
let content = fs.readFileSync(file, 'utf8');

// We need to modify the rendering logic around line 420.
// Let's find the relevant section.
// The code looks something like:
/*
          <button
            onClick={() => {
              if (currentUser) handleAvatarTap(currentUser.id)
            }}
            className="flex flex-col items-center gap-2 shrink-0 group w-[72px]"
          >
            <div className="relative">
              <div className="flex size-[72px] items-center justify-center rounded-full bg-secondary transition-transform group-hover:scale-95 group-active:scale-90 border-2 border-border overflow-hidden">
                {currentUserAvatar ? (
...
*/

// First, let's parse the file content and inject the current user story check before rendering "أنت" circle.

const currentUserCheckLogic = `
          {(() => {
            // Find if current user has active stories in the fetched array
            const currentUserStoriesIndex = stories.findIndex((group: any) => group.id === currentUser?.id)
            const currentUserStoryGroup = currentUserStoriesIndex >= 0 ? stories[currentUserStoriesIndex] : null
            const hasMyUnseen = currentUserStoryGroup ? (
              currentUserStoryGroup.hasUnseen !== undefined
                ? currentUserStoryGroup.hasUnseen && !currentUserStoryGroup.stories.every((s:any) => viewedStoryIds.has(s.id))
                : currentUserStoryGroup.stories.some((s: any) => !viewedStoryIds.has(s.id))
            ) : false

            // Filter out current user from the rest of the list so it doesn't duplicate
            const otherStories = stories.filter((group: any) => group.id !== currentUser?.id)

            return (
              <>
                <button
                  onClick={() => {
                    if (currentUser) handleAvatarTap(currentUser.id)
                  }}
                  className="flex flex-col items-center gap-2 shrink-0 group w-[72px]"
                >
                  <div className="relative">
                    <div className={\`flex size-[72px] items-center justify-center rounded-full bg-secondary transition-transform group-hover:scale-95 group-active:scale-90 border-2 overflow-hidden \${
                      currentUserStoryGroup
                        ? (hasMyUnseen ? "border-transparent bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[3px]" : "border-border p-[3px]")
                        : "border-border"
                    }\`}>
                      <div className="size-full rounded-full bg-background overflow-hidden flex items-center justify-center">
                        {currentUserAvatar ? (
                          <img src={currentUserAvatar} alt="My Avatar" className="size-full object-cover" />
                        ) : (
                          <Heart className="size-8 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {!currentUserStoryGroup && (
                      <div
                        className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-foreground text-background shadow-sm border-2 border-background cursor-pointer z-20 pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowStoryUpload(true);
                        }}
                      >
                        <span className="text-lg leading-none mt-[-2px]">+</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-foreground">أنت</span>
                </button>

                {otherStories.map((userGroup: any, i: number) => {
`;

// Now let's replace the existing structure.
// I'll read the original parts precisely.
