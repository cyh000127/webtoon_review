---
name: web-update
description: Use when the user says "/web update", "web update", or asks to process mobile webtoon queue entries into the webtoon_review page. The skill upgrades pending queue rows into the JSON/XML webtoon archive by researching official/public metadata, saving cover images, updating description files, validating, committing, and pushing.
---

# Webtoon Archive Update

## Trigger

Use this skill when the user asks for `/web update` or wants queued webtoons reflected on the page.

## Workflow

1. Sync first:
   - `git pull --rebase`
   - `npm run validate:queue`
   - `npm run validate:webtoons`
2. Read `queue/pending-webtoons.jsonl` from oldest to newest.
3. For each pending entry:
   - Check whether the title already exists in `webtoons/webtoons.json`.
   - If it exists, update only user-facing fields that are missing or stale.
   - If it is new, assign the next three-digit ID.
4. Research official/public metadata. Prefer official platform pages, then publisher/retail/public pages.
   - title
   - author
   - platform
   - platform ID
   - genres
   - description
   - serialization status
   - episode count
   - update weekdays
   - latest episode update date when available
   - representative cover image
5. Do not use illegal mirror sites. If official/public evidence is weak, leave the row in pending and report the blocker.
6. Save the cover as `webtoons/covers/NNN.ext`.
7. Add or update:
   - `webtoons/webtoons.json`
   - `webtoons/webtoons.xml`
   - `webtoons/description/NNN.txt`
8. Move processed rows from `queue/pending-webtoons.jsonl` to `queue/processed-webtoons.jsonl`.
   - Preserve original queue fields.
   - Set `status` to `processed`.
   - Add `processedAt`, `archiveId`, `archiveTitle`, and `commitSha`.
   - Leave `commitSha` empty before commit if needed.
9. Validate:
   - `npm run refresh:webtoons:dry` when adding or correcting ongoing titles
   - `npm run validate:queue`
   - `npm run validate:webtoons`
   - `xmllint --noout webtoons/webtoons.xml` when `xmllint` is available.
10. Commit and push:
   - New archive entry: `feat: 대기 웹툰 아카이브 반영`
   - Queue-only cleanup: `chore: 웹툰 대기열 정리`
   - Skill/docs-only change: `docs: 웹 업데이트 스킬 추가`

## Mapping

- `rating` -> `userRating`
- Ignore legacy `review` and `dropReason`; personal review text is not stored in the archive.
- `readingStatus: completed` -> `userReadingStatus: finished`
- `readingStatus: dropped` -> `userReadingStatus: dropped`
- missing legacy `readingStatus` with a completion-like review may be inferred as `finished` only when the user intent is clear.
- `readProgress` -> `userProgress`
- legacy rows without `readProgress` should use a conservative progress value and mention the inference in `note`.
- Official update weekdays -> `updateWeekdays`, `updateScheduleLabel`, `updateScheduleSource`.
- Latest episode release date -> `latestEpisodeUpdatedAt` in `YYYY-MM-DD` format.

## Update Schedule Sources

- Prefer official platform schedule data.
- For Naver Webtoon, use `https://comic.naver.com/api/webtoon/titlelist/weekday` when possible.
- For KakaoPage, use the official content page `__NEXT_DATA__` `contentHomeOverview.content.pubPeriod`.
- If an ongoing Naver title is missing from the official weekday list because of hiatus/archive state, infer from the latest official episode date and set `updateScheduleSource` to `latestEpisodeDate`.
- Completed titles use `updateWeekdays: []`, `updateScheduleLabel: "완결"`, and `updateScheduleSource: "completed"`.

## Stop Conditions

Stop and ask the user when:

- multiple official title candidates fit the input.
- no reliable cover image can be sourced.
- the queue row lacks enough user intent to choose `finished`, `reading`, or `dropped`.
- validation fails for reasons unrelated to the processed row.
