# Submission Cleanup Design

Date: 2026-06-18

## Goal

Clean the repository so it matches the final Vietnamese submission report and includes the new `Logical_Questions.docx` artifact. The final repository should only present the challenges that are part of the submission: 1, 2, 3, 4, 5, 7, 8, and 9.

## Scope to Keep

Keep these challenge folders and related root markdown files:

- `Challenge_1/`
- `Challenge_2/`
- `Challenge_3/`
- `Challenge_4/`
- `Challenge_5/`
- `Challenge_7/`
- `Challenge_8/`
- `Challenge_9/`
- `AI_Challenge_03.md`
- `AI_Challenge_04.md`
- `AI_Challenge_05.md`
- `AI_Challenge_07.md`
- `AI_Challenge_08.md`
- `AI_Challenge_09.md`
- `Challenge_1/AI_Challenge_01.md`
- root `README.md`
- root `.gitignore`
- root `Logical_Questions.docx`

Keep untracked screenshot files in the repository working directory unless the user separately asks to delete them. They are not part of this cleanup commit unless already tracked or explicitly selected later.

## Scope to Remove

Remove challenge folders and root challenge briefs that are not part of the final report:

- `Challenge_6/`
- `Challenge_10/`
- `Challenge_11/`
- `Challenge_12/`
- `Challenge_13/`
- `Challenge_14/`
- `Challenge_15/`
- `AI_Challenge_06.md`
- `AI_Challenge_10.md`
- `AI_Challenge_11.md`
- `AI_Challenge_12.md`
- `AI_Challenge_13.md`
- `AI_Challenge_14.md`
- `AI_Challenge_15.md`

## Document Update

Update `C:\Users\Admin\Desktop\AI_Engineering_Submission_Report_Tieng_Viet_FINAL.docx` so it remains consistent with the cleaned repository:

- Update the report date to 18/06/2026.
- Keep the final submission list as challenges 1, 2, 3, 4, 5, 7, 8, and 9.
- Add a note that non-submission challenge folders were removed from the GitHub repository to avoid unused artifacts.
- Add `Logical_Questions.docx` as a supplemental artifact committed in the repository root.

If practical, also place a copy of the updated report in the repository root so it can be committed and pushed to GitHub with the cleanup.

## Git Workflow

After cleanup and document update:

1. Inspect `git status`.
2. Stage only intended changes:
   - removals for unused challenges and briefs;
   - `Logical_Questions.docx`;
   - updated report copy if created in the repository;
   - README changes if they remain consistent with the final scope.
3. Commit with a clear message.
4. Push to `origin/main`.

## Verification

Before reporting completion:

- Confirm removed challenge folders no longer appear in git-tracked files.
- Confirm final challenge folders 1, 2, 3, 4, 5, 7, 8, 9 still exist.
- Confirm `Logical_Questions.docx` is staged/committed.
- Confirm the final report has been updated or explain any limitation if Word automation is unavailable.
- Confirm push result from Git.
