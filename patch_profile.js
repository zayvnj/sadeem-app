const fs = require('fs');
const file = 'components/sadeem/profile-view.tsx';
let content = fs.readFileSync(file, 'utf8');

// The code to inject inside the sheet
const coverButtonSheetCode = `
            <div className="w-full flex justify-end px-4 mb-4">
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-sm font-semibold border border-border/50"
              >
                {isUploadingCover ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                تغيير الغلاف
              </button>
            </div>
`;

// Remove original edit cover button from outside
content = content.replace(/\{\/\* Edit Cover Button - pointer events auto so it can be clicked \*\/\}\s*<div className="absolute top-36 left-4 z-10">[\s\S]*?<input[\s\S]*?onChange=\{handleCoverChange\}\s*\/>\s*<\/div>/g, '');

// Insert the new button in the edit profile sheet right after SheetHeader
content = content.replace(/(<SheetTitle className="text-center">تعديل الملف الشخصي<\/SheetTitle>\s*<\/SheetHeader>)/, '$1' + coverButtonSheetCode);

// Also need to move the input hidden field, might as well put it near the button or at the bottom of the form
const hiddenInputCode = `
              <input
                type="file"
                ref={coverInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleCoverChange}
              />
`;

content = content.replace(/(<div className="flex flex-col items-center gap-4 mb-6">)/, hiddenInputCode + '$1');

fs.writeFileSync(file, content);
