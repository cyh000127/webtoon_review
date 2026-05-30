# 웹툰 대기열 컨벤션

## 목적

모바일 입력 앱은 웹툰 제목, 별점, 읽은 위치, 감상 상태, 한줄평 또는 중도 이탈 사유를 받아 대기열 파일에 커밋한다.  
대기열 항목은 나중에 Codex가 공식/공개 정보를 확인한 뒤 정식 아카이브 데이터로 승격한다.

## 파일

```text
queue/
  pending-webtoons.jsonl
  processed-webtoons.jsonl
```

- `pending-webtoons.jsonl`: 아직 정식 아카이브에 반영하지 않은 입력
- `processed-webtoons.jsonl`: 정식 아카이브에 반영한 입력 이력

두 파일은 JSON Lines 형식을 사용한다. 한 줄에 JSON 객체 하나만 둔다.

## Pending 항목 형식

```json
{"id":"wq_20260525_000001","title":"웹툰 제목","rating":4.5,"readProgress":"151화","readingStatus":"completed","review":"사용자 한줄평","createdAt":"2026-05-25T15:00:00.000+09:00","source":"mobile-queue-app","status":"pending"}
```

필드:

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `id` | 예 | 대기열 항목 ID. `wq_YYYYMMDD_HHmmss` 형식 권장 |
| `title` | 예 | 사용자가 입력한 웹툰 제목 |
| `rating` | 예 | 사용자 개인 별점. 0부터 5까지 숫자 |
| `readProgress` | 예 | 사용자가 어디까지 봤는지 적은 문자열. 예: `151화`, `완결까지`, `34화` |
| `readingStatus` | 예 | `reading`, `completed`, `dropped` 중 하나 |
| `review` | 조건부 | 완주 항목의 한줄평. `reading` 상태에서는 비워둘 수 있음 |

완주로 제출된 항목은 정식 아카이브 승격 시 개인 기록 기준 완결로 처리한다. 즉 `userReadingStatus`는 `finished`, `serializationStatus`는 `completed`, `group`은 `completed-section`으로 변환한다.
| `dropReason` | 조건부 | `dropped` 상태일 때 필요한 중도 이탈 사유 |
| `createdAt` | 예 | 입력 시각. ISO 8601 문자열 |
| `updatedAt` | 아니오 | 앱에서 최근 제출을 수정한 시각. ISO 8601 문자열 |
| `source` | 예 | `mobile-queue-app` |
| `status` | 예 | `pending` |

기존 모바일 앱에서 이미 제출된 legacy 항목은 `readProgress`, `readingStatus`가 없을 수 있다.  
Codex는 legacy 항목을 처리할 때 기존 `review`를 유지하고, 필요한 경우 사용자에게 읽은 위치와 감상 상태를 확인한다.

## Processed 항목 형식

```json
{"id":"wq_20260525_000001","title":"웹툰 제목","rating":4.5,"readProgress":"151화","readingStatus":"completed","review":"사용자 한줄평","createdAt":"2026-05-25T15:00:00.000+09:00","source":"mobile-queue-app","status":"processed","processedAt":"2026-05-25T16:00:00.000+09:00","archiveId":"044","archiveTitle":"공식 웹툰 제목","commitSha":"abcdef1"}
```

추가 필드:

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `processedAt` | 예 | Codex가 정식 아카이브에 반영한 시각 |
| `archiveId` | 예 | `webtoons.json`에 부여한 세 자리 ID |
| `archiveTitle` | 예 | 공식/공개 정보 기준 보정 제목 |
| `commitSha` | 아니오 | 반영 커밋 SHA. 커밋 전이면 비워둘 수 있음 |

## 입력 앱 작성 규칙

- 앱은 `pending-webtoons.jsonl`만 수정한다.
- 앱은 `webtoons.json`, `webtoons.xml`, `covers`, `description`을 수정하지 않는다.
- 입력값 앞뒤 공백은 제거한다.
- 제목과 읽은 위치는 빈 문자열이면 제출하지 않는다.
- 평점은 숫자이며 0 이상 5 이하만 허용한다.
- `readingStatus`가 `completed`이면 `review`가 필요하다.
- `readingStatus`가 `dropped`이면 `dropReason`이 필요하다.
- 같은 브라우저에서 제출 중에는 버튼을 비활성화해 중복 커밋을 막는다.
- 커밋 메시지는 `chore: 웹툰 대기열 추가`를 사용한다.
- 최근 제출 수정은 같은 `id`의 JSON Lines 한 줄을 교체하고, 커밋 메시지는 `chore: 웹툰 대기열 수정`을 사용한다.

## GitHub API 규칙

- `GET /repos/{owner}/{repo}/contents/{path}`로 파일 content와 `sha`를 읽는다.
- `PUT /repos/{owner}/{repo}/contents/{path}`로 append된 전체 파일을 커밋한다.
- 기존 파일을 업데이트할 때는 GitHub API 요청 본문에 현재 파일의 `sha`를 포함한다.
- `content`는 Base64 인코딩한다.
- 409 conflict가 발생하면 파일을 다시 읽고 한 번 재시도한다.

## Codex 처리 규칙

Codex가 대기열을 정식 아카이브로 반영할 때는 아래 순서를 지킨다.

1. `git pull`로 최신 queue를 가져온다.
2. `queue/pending-webtoons.jsonl`을 읽는다.
3. 오래된 항목부터 하나씩 처리한다.
4. 공식/공개 페이지에서 표지, 작가, 장르, 작품 소개, 연재 상태, 회차 수를 확인한다.
5. 표지는 `webtoons/covers/세자리ID.확장자`로 저장한다.
6. `webtoons/webtoons.json`에 항목을 추가한다.
7. `webtoons/webtoons.xml`에 같은 항목을 추가한다.
8. `webtoons/description/세자리ID.txt`를 만든다.
9. 처리한 pending 줄은 `processed-webtoons.jsonl`로 옮기고 pending에서 제거한다.
10. `npm run validate:webtoons`와 queue 검증을 실행한다.
11. 커밋 메시지는 `feat: 대기 웹툰 아카이브 반영` 또는 범위가 작으면 `chore: 웹툰 대기열 정리`를 사용한다.
12. 원격에 push한다.

## 중복 처리

- 같은 제목이 이미 정식 아카이브에 있으면 새 항목을 만들지 않는다.
- 기존 항목에 별점/후기만 보강할 수 있으면 해당 항목을 업데이트한다.
- 판단이 애매하면 pending에 남기고 `note`를 추가한 별도 정리 커밋을 만들지 않는다.
