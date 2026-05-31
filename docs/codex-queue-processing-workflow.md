# Codex 대기열 처리 워크플로우

## 목적

`queue/pending-webtoons.jsonl`에 쌓인 모바일 입력 항목을 정식 웹툰 아카이브로 반영한다.

모바일 앱은 제목, 별점, 읽은 위치, 감상 상태만 올린다.  
Codex는 공식/공개 정보를 확인해 표지, 작가, 장르, 작품 소개, 연재 상태, 회차 수를 보강한다.

## 시작 전 확인

```bash
git pull
npm run validate:queue
npm run validate:webtoons
```

확인할 파일:

- `queue/pending-webtoons.jsonl`
- `queue/processed-webtoons.jsonl`
- `webtoons/webtoons.json`
- `webtoons/webtoons.xml`
- `webtoons/covers`
- `webtoons/description`

## 처리 순서

1. `queue/pending-webtoons.jsonl`의 가장 오래된 항목부터 읽는다.
2. 같은 제목 또는 보정 가능한 제목이 이미 `webtoons/webtoons.json`에 있는지 확인한다.
3. 기존 항목이 있으면 새 작품을 만들지 않고 별점/독서 상태 보강이 가능한지 판단한다.
4. 새 작품이면 다음 세 자리 ID를 정한다.
5. 공식/공개 페이지에서 아래 정보를 확인한다.
   - 공식 제목
   - 작가
   - 플랫폼
   - 플랫폼 작품 ID
   - 장르
   - 작품 소개
   - 연재 상태
   - 회차 수
   - 대표 표지 이미지
6. 표지를 `webtoons/covers/세자리ID.확장자`로 저장한다.
7. `webtoons/webtoons.json`에 새 항목을 추가한다.
8. `webtoons/webtoons.xml`에 같은 항목을 추가한다.
9. `webtoons/description/세자리ID.txt`를 만든다.
10. 처리한 pending 줄을 `queue/processed-webtoons.jsonl`로 옮긴다.
11. pending 파일에서는 처리한 줄을 제거한다.
12. 검증 명령을 실행한다.

```bash
npm run validate:queue
npm run validate:webtoons
xmllint --noout webtoons/webtoons.xml
```

## JSON 항목 작성 규칙

정식 아카이브 항목은 `docs/webtoon-data-convention.md`를 따른다.

모바일 입력값 매핑:

| pending 필드 | 정식 아카이브 필드 |
| --- | --- |
| `title` | `inputTitle` |
| 공식 보정 제목 | `title` |
| `rating` | `userRating` |

`note`에는 제목 보정, 공식 정보 확인 여부, 특이사항을 남긴다.
`userProgress`는 `151화`처럼 화수만 남긴다. `completed` 항목에 `readProgress`가 없으면 공식 공개분 기준 회차 수를 사용한다.

## Description 파일 작성 규칙

```text
공식 웹툰 제목

공식/공개 정보 기준 작품 소개 요약.
```

## Processed 항목 작성 규칙

pending 원본 필드를 유지하고 아래 필드를 추가한다.

```json
{"status":"processed","processedAt":"2026-05-25T16:00:00.000+09:00","archiveId":"044","archiveTitle":"공식 웹툰 제목","commitSha":""}
```

커밋 전에는 `commitSha`를 빈 문자열로 둘 수 있다.  
커밋 후 필요하면 후속 커밋에서 SHA를 채운다.

## 커밋 규칙

새 작품이 정식 아카이브에 추가되면:

```text
feat: 대기 웹툰 아카이브 반영
```

대기열 파일만 정리하면:

```text
chore: 웹툰 대기열 정리
```

문서만 수정하면:

```text
docs: 웹툰 대기열 처리 문서 수정
```

## 보류 기준

아래 상황에서는 pending 항목을 처리하지 않고 남긴다.

- 공식/공개 페이지를 찾지 못한 경우
- 동일 제목 후보가 여러 개라 확신하기 어려운 경우
- 표지 이미지 출처를 확인할 수 없는 경우
- 사용자의 입력 제목과 공식 작품명이 너무 다르고 보정 근거가 부족한 경우

보류한 경우 별도 커밋을 만들지 않고 사용자에게 확인할 내용을 보고한다.
