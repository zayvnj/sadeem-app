const fs = require('fs');
const file = 'components/sadeem/home-feed.tsx';
let content = fs.readFileSync(file, 'utf8');

const searchBlock = `          <button
            onClick={() => handleAvatarTap(currentUser?.id || '')}
            className="flex flex-col items-center gap-2 shrink-0 group w-[72px]"
          >
            <div className="relative">
              <div className="flex size-[72px] items-center justify-center rounded-full bg-secondary transition-transform group-hover:scale-95 group-active:scale-90 border-2 border-border overflow-hidden">
                {currentUserAvatar ? (
                  <img src={currentUserAvatar} alt="My Avatar" className="size-full object-cover" />
                ) : (
                  <Heart className="size-8 text-muted-foreground" />
                )}
              </div>
              <div
                className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-foreground text-background shadow-sm border-2 border-background cursor-pointer z-20 pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStoryUpload(true);
                }}
              >
                <span className="text-lg leading-none mt-[-2px]">+</span>
              </div>
            </div>
            <span className="text-xs font-bold text-foreground">أنت</span>
          </button>

          {stories.map((userGroup: any, i: number) => {`;

const replaceBlock = `          {(() => {
            // Find if current user has active stories in the fetched array
            const currentUserStoriesIndex = stories.findIndex((group: any) => group.id === currentUser?.id)
            const currentUserStoryGroup = currentUserStoriesIndex >= 0 ? stories[currentUserStoriesIndex] : null

            // Note: fallback to userGroup.stories or userGroup array since both formats might be used
            const myStoriesArr = currentUserStoryGroup?.stories || (Array.isArray(currentUserStoryGroup) ? currentUserStoryGroup : [])

            const hasMyUnseen = currentUserStoryGroup ? (
              currentUserStoryGroup.hasUnseen !== undefined
                ? currentUserStoryGroup.hasUnseen && !myStoriesArr.every((s:any) => viewedStoryIds.has(s.id))
                : myStoriesArr.some((s: any) => !viewedStoryIds.has(s.id))
            ) : false

            // Filter out current user from the rest of the list so it doesn't duplicate
            const otherStories = stories.filter((group: any) => group.id !== currentUser?.id && group[0]?.user_id !== currentUser?.id)

            return (
              <>
                <button
                  onClick={() => handleAvatarTap(currentUser?.id || '')}
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

                {otherStories.map((userGroup: any, i: number) => {`;

content = content.replace(searchBlock, replaceBlock);

// We also need to close the IIFE wrap at the end of the mapping. Let's find where stories map ends.
const endMapBlock = `                </span>
              </button>
            )
          })}
        </div>
      </div>`;

const endReplaceBlock = `                </span>
              </button>
            )
          })}
          </>
        )
      })()}
        </div>
      </div>`;

content = content.replace(endMapBlock, endReplaceBlock);

fs.writeFileSync(file, content);
