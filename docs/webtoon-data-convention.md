# 웹툰 JSON 입력 컨벤션

웹툰 기록은 `webtoons/webtoons.json`에 추가한다.  
DB를 쓰지 않기 때문에 새 웹툰을 넣을 때는 아래 필드 규칙을 지켜 JSON의 `items` 배열에 항목을 추가한다.

핸드폰 입력 앱에서 들어온 임시 항목은 이 문서가 아니라 `docs/webtoon-queue-convention.md`를 먼저 따른다. Codex가 대기열 항목을 정식 아카이브로 승격할 때 이 문서의 규칙을 적용한다.

## 새 웹툰 추가 작업 체크리스트

새 웹툰을 추가할 때는 데이터를 넣기 전에 아래 정보를 먼저 모은다.

- 공식/공개 페이지에서 표지 이미지를 찾아 `webtoons/covers/세자리ID.확장자`로 저장한다.
- 공식 작품 URL을 확인해 `officialUrl`에 저장한다.
- 공식/공개 페이지 기준 장르를 확인하고, 화면 필터에 맞는 장르명으로 정리한다.
- 작가명을 확인한다. 글/그림/원작이 나뉘면 `/` 또는 쉼표로 구분한다.
- 작품 소개글을 확인하고, 너무 길면 의미가 유지되도록 짧게 요약한다.
- 공식/공개 페이지 기준 업데이트 요일을 확인해 `updateWeekdays`에 기록한다.
- 최신 회차 공개일을 확인할 수 있으면 `latestEpisodeUpdatedAt`에 `YYYY-MM-DD`로 기록한다.
- 사용자는 개인 별점 `userRating`만 남긴다. 개인 리뷰, 완주 후기, 중도 포기 사유는 저장하지 않는다.
- JSON, XML, 설명 파일의 제목/작가/장르/소개/표지 경로가 서로 맞는지 확인한다.
- 마지막에 `npm run validate:webtoons`로 표지와 설명 파일 매칭을 검증한다.

## 수정 파일 세트

웹툰을 새로 추가하거나 기존 항목을 보정할 때는 아래 파일을 한 묶음으로 관리한다.

- `webtoons/webtoons.json`: 앱이 직접 읽는 데이터 원본
- `webtoons/webtoons.xml`: 보존용 XML 데이터
- `webtoons/covers/세자리ID.확장자`: 표지 이미지
- `webtoons/description/세자리ID.txt`: 작품 소개 텍스트

JSON과 XML은 같은 작품 수, 같은 ID, 같은 표지 경로, 같은 설명 파일 경로를 유지한다.

## 기본 구조

```json
{
  "id": "035",
  "inputTitle": "사용자가 보낸 제목",
  "title": "웹툰 제목",
  "author": "작가명",
  "platform": "네이버웹툰",
  "contentType": "웹툰",
  "platformId": "123456",
  "officialUrl": "https://comic.naver.com/webtoon/list?titleId=123456",
  "genres": ["로맨스", "드라마"],
  "description": "공식/공개 정보 기준 작품 소개",
  "serializationStatus": "ongoing",
  "serializationLabel": "연재중",
  "episodeCount": 120,
  "updateWeekdays": ["월"],
  "updateScheduleLabel": "월",
  "updateScheduleSource": "official",
  "latestEpisodeUpdatedAt": "2026-05-25",
  "userReadingStatus": "reading",
  "userProgress": "80화",
  "group": "ongoing",
  "coverImage": "webtoons/covers/035.jpg",
  "descriptionFile": "webtoons/description/035.txt",
  "userRating": 4.5,
  "note": ""
}
```

## 필드 설명

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `id` | 예 | 고유 ID. 세 자리 숫자 사용 |
| `inputTitle` | 예 | 사용자가 보낸 원래 제목 |
| `title` | 예 | 웹툰 제목 |
| `author` | 예 | 작가명. 여러 명이면 쉼표로 구분 |
| `platform` | 예 | 플랫폼명 |
| `contentType` | 예 | `웹툰`, `웹소설` 등 콘텐츠 유형 |
| `platformId` | 아니오 | 공식 플랫폼의 작품 ID가 있으면 기록 |
| `officialUrl` | 예 | 공식 플랫폼에서 작품을 볼 수 있는 현재 URL |
| `genres` | 예 | 장르 배열 |
| `description` | 예 | 작품 소개 |
| `serializationStatus` | 예 | `ongoing` 또는 `completed` |
| `serializationLabel` | 예 | 화면에 보여줄 연재 상태 라벨 |
| `episodeCount` | 예 | 공식/공개 기준 회차 수 |
| `updateWeekdays` | 예 | 업데이트 요일 배열. 연재중 작품은 `["월"]`처럼 기록하고 완결은 빈 배열 `[]` |
| `updateScheduleLabel` | 예 | 화면 표시용 업데이트 요일. 예: `월`, `월, 목`, `완결` |
| `updateScheduleSource` | 예 | 업데이트 요일 출처. `official`, `latestEpisodeDate`, `completed`, `unknown` |
| `latestEpisodeUpdatedAt` | 아니오 | 최신 회차 공개일. 확인되면 `YYYY-MM-DD`로 기록 |
| `userReadingStatus` | 예 | `reading`, `finished`, `dropped` |
| `userProgress` | 예 | 현재 본 화수만 `80화`처럼 기록. `까지`, `완주`, `완독`, `에서 중단` 같은 상태 표현은 쓰지 않음 |
| `group` | 예 | 기존 정리 그룹. `ongoing`, `completed-section`, `dropped` 등 |
| `coverImage` | 예 | 표지 이미지 경로 |
| `descriptionFile` | 예 | 작품 소개 텍스트 파일 경로 |
| `userRating` | 예 | 개인 평점. 0부터 5까지 숫자. 저장은 유지하지만 화면에는 표시하지 않음 |
| `note` | 예 | 제목 보정, 확인 사항 등. 없으면 빈 문자열 |

`platformId`는 네이버웹툰의 `titleId`처럼 공식 플랫폼에서 작품을 식별하는 값이다. 공식 페이지를 확인한 경우 가능한 한 기록한다.
`officialUrl`은 상세 화면의 `보러가기` 링크에 사용하므로 불법 공유 사이트나 비공식 소개 페이지가 아닌 공식 플랫폼 URL만 기록한다.

## 허용 값

### `serializationStatus`

- `ongoing`: 연재
- `completed`: 완결

### `userReadingStatus`

- `reading`: 읽는 중
- `finished`: 완주
- `dropped`: 중도 포기

### `updateScheduleSource`

- `official`: 공식 요일 목록 또는 공식 작품 페이지의 요일 표기에서 확인
- `latestEpisodeDate`: 공식 요일 목록에는 없지만 최신 회차 공개일의 요일로 추정
- `completed`: 완결이라 정기 업데이트 요일이 없음
- `unknown`: 공식/공개 정보로 확인하지 못함

## 완주 처리 규칙

- 사용자가 `완주`라고 입력한 작품은 개인 기록 기준으로 완결 작품처럼 다룬다.
- `userReadingStatus`는 `finished`, `serializationStatus`는 `completed`, `group`은 `completed-section`으로 기록한다.
- 공식 연재 상태가 휴재 또는 연재중이어도, 사용자가 현재 공개분을 완주로 기록했다면 화면에서는 완결 탭에 들어가도록 `serializationLabel`을 `완결(회차)` 형식으로 적는다.
- `userProgress`에는 `96화`처럼 화수만 남기고, 완주 여부는 `userReadingStatus`로만 표현한다.

### `platform`

현재 아카이브에서 쓰는 플랫폼명은 다음과 같다.

- `네이버웹툰`
- `카카오페이지`
- `네이버 시리즈`
- `레진코믹스`

플랫폼을 추가하면 `src/App.tsx`의 `platformMeta`에 표시 색상과 짧은 라벨을 함께 추가한다.

## 작성 규칙

- 표지 이미지는 `webtoons/covers/세자리ID.확장자` 형식을 권장한다.
- 공식 작품 URL은 `officialUrl`에 기록하고 JSON/XML에 같은 값을 유지한다.
- 공식 대표 표지가 있으면 임시 SVG보다 실제 표지 이미지를 우선한다.
- 작품 소개 파일은 `webtoons/description/세자리ID.txt` 형식을 권장한다.
- `descriptionFile`의 첫 줄은 작품 제목으로 시작한다.
- 설명 파일에는 작품 소개만 적고, 개인 리뷰나 중도 포기 사유를 적지 않는다.
- 개인 평점이 있으면 `userRating`에만 기록한다.
- 화면 카드와 목록에는 `userRating`을 표시하지 않고 `description`만 표시한다.
- 새로 추가하는 웹툰은 기본적으로 사용자의 별점과 독서 상태만 받는다.
- 새로 추가하는 웹툰은 공식/공개 페이지에서 업데이트 요일도 함께 확인한다.
- 네이버웹툰은 공식 요일 목록 API, 카카오페이지는 공식 작품 페이지의 `pubPeriod` 값을 우선한다.
- 장르는 화면 필터에 그대로 쓰이므로 같은 장르는 같은 표기를 유지한다.
- 아카이브를 수정한 뒤 `npm run validate:webtoons`를 실행한다.
- 연재중 작품의 최신 화수/요일은 `npm run refresh:webtoons`로 갱신한다. 완결 작품의 화수는 이 명령으로 변경하지 않는다.

## 설명 파일 형식

```text
웹툰 제목

공식/공개 정보 기준 작품 소개 요약.
```

## 새 웹툰 추가 예시

```json
{
  "id": "035",
  "inputTitle": "샘플 로맨스",
  "title": "샘플 로맨스",
  "author": "홍길동",
  "platform": "네이버웹툰",
  "contentType": "웹툰",
  "platformId": "123456",
  "officialUrl": "https://comic.naver.com/webtoon/list?titleId=123456",
  "genres": ["로맨스", "드라마"],
  "description": "후반부 감정선이 좋아서 끝까지 읽기 좋은 로맨스 웹툰이다.",
  "serializationStatus": "completed",
  "serializationLabel": "완결",
  "episodeCount": 96,
  "updateWeekdays": [],
  "updateScheduleLabel": "완결",
  "updateScheduleSource": "completed",
  "latestEpisodeUpdatedAt": "2026-05-25",
  "userReadingStatus": "finished",
  "userProgress": "96화",
  "group": "completed-section",
  "coverImage": "webtoons/covers/035.jpg",
  "descriptionFile": "webtoons/description/035.txt",
  "userRating": 4.5,
  "note": ""
}
```
