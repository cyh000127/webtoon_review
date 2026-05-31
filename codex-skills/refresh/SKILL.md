---
name: refresh
description: Use when the user says "/refresh", "refresh", or asks to refresh current episode counts for non-completed webtoons in the webtoon_review archive. The skill runs the official-source refresh script, validates JSON/XML, commits, and pushes.
---

# Webtoon Episode Refresh

## Trigger

Use this skill when the user asks for `/refresh` or wants current webtoon episode counts updated.

## Scope

- Refresh only titles whose `serializationStatus` is `ongoing`.
- Do not change completed titles' `episodeCount`.
- Keep user fields such as `userReadingStatus`, `userProgress`, and `userRating` unchanged.
- Keep personal review text out of the archive.

## Workflow

1. Sync first:
   - `git pull --rebase`
   - `npm run validate:webtoons`
2. Run a dry check:
   - `npm run refresh:webtoons:dry`
3. Run the refresh:
   - `npm run refresh:webtoons`
4. Review the changed ongoing titles:
   - episode count changes
   - `updateWeekdays`
   - `updateScheduleLabel`
   - `updateScheduleSource`
   - `latestEpisodeUpdatedAt`
5. Validate:
   - `npm run validate:webtoons`
   - `xmllint --noout webtoons/webtoons.xml` when available
   - `npm run build`
6. Commit and push:
   - Use `feat: 웹툰 최신 화수 갱신`

## Official Sources

- Naver Webtoon weekday list: `https://comic.naver.com/api/webtoon/titlelist/weekday`
- Naver Webtoon episode list: `https://comic.naver.com/api/article/list?titleId={titleId}&page=1`
- KakaoPage official content page: `https://page.kakao.com/content/{seriesId}`
- KakaoPage product list: `https://page.kakao.com/api/gateway/api/v2/content/product/list?series_id={seriesId}&cursor_index=0&cursor_direction=INIT&window_size=500`

## Notes

- `updateScheduleSource: "official"` means the weekday came from official schedule data.
- `updateScheduleSource: "latestEpisodeDate"` means the title was not in the official weekday list, so the weekday was inferred from the latest official episode date.
- `updateScheduleSource: "completed"` means the title is completed and has no active update weekday.
