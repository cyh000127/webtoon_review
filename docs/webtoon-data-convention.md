# 웹툰 JSON 입력 컨벤션

웹툰 기록은 `src/data/webtoons.json`에 배열 형태로 추가한다.  
DB를 쓰지 않기 때문에 새 웹툰을 넣을 때는 아래 필드 규칙을 지켜 JSON에 항목을 추가한다.

## 기본 구조

```json
{
  "id": "unique-webtoon-id",
  "title": "웹툰 제목",
  "author": "작가명",
  "platform": "naver",
  "serializationStatus": "ongoing",
  "readingStatus": "finished",
  "genres": ["로맨스", "드라마"],
  "coverImage": "/covers/example.svg",
  "episodeProgress": "120화 완주",
  "rating": 4.5,
  "review": "완주한 웹툰에 남기는 짧은 리뷰",
  "dropReason": "",
  "startedAt": "2025-01-04",
  "finishedAt": "2025-03-20",
  "updatedAt": "2026-05-25",
  "isFavorite": true,
  "tags": ["재탕가능", "캐릭터"]
}
```

## 필드 설명

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `id` | 예 | 고유 ID. 영어 소문자, 숫자, 하이픈 사용 권장 |
| `title` | 예 | 웹툰 제목 |
| `author` | 예 | 작가명. 여러 명이면 쉼표로 구분 |
| `platform` | 예 | 플랫폼 ID |
| `serializationStatus` | 예 | `ongoing` 또는 `completed` |
| `readingStatus` | 예 | `finished` 또는 `dropped` |
| `genres` | 예 | 장르 배열 |
| `coverImage` | 예 | 표지 이미지 경로 또는 그라디언트 대체 이미지 경로 |
| `episodeProgress` | 예 | `80화 완주`, `23화까지`, `시즌1 완주`처럼 자유 표기 |
| `rating` | 조건부 | `readingStatus`가 `finished`일 때 권장. 0부터 5까지 0.5 단위 |
| `review` | 조건부 | `finished`일 때 사용 |
| `dropReason` | 조건부 | `dropped`일 때 사용 |
| `startedAt` | 아니오 | 읽기 시작일. `YYYY-MM-DD` |
| `finishedAt` | 아니오 | 완주일 또는 중도 포기일. `YYYY-MM-DD` |
| `updatedAt` | 예 | 기록 수정일. `YYYY-MM-DD` |
| `isFavorite` | 아니오 | 즐겨찾기 여부 |
| `tags` | 아니오 | 개인 분류용 태그 |

## 허용 값

### `serializationStatus`

- `ongoing`: 연재
- `completed`: 완결

### `readingStatus`

- `finished`: 완주
- `dropped`: 중도 포기

### `platform`

초기 구현에서 쓰는 플랫폼 ID는 다음과 같다.

- `naver`
- `kakao`
- `kakao-page`
- `ridibooks`
- `lezhin`
- `bomtoon`
- `peanutoon`
- `other`

필요하면 `src/types/webtoon.ts`의 플랫폼 타입과 `src/App.tsx`의 플랫폼 표시 정보를 함께 추가한다.

## 작성 규칙

- `finished`인 경우 `review`를 비워두지 않는다.
- `dropped`인 경우 `dropReason`을 비워두지 않는다.
- 표지 이미지가 아직 없으면 우선 `/covers/placeholder-숫자.svg` 중 하나를 사용한다.
- 날짜는 모두 `YYYY-MM-DD` 형식으로 적는다.
- 장르는 화면 필터에 그대로 쓰이므로 같은 장르는 같은 표기를 유지한다.

## 새 웹툰 추가 예시

```json
{
  "id": "sample-romance-001",
  "title": "샘플 로맨스",
  "author": "홍길동",
  "platform": "naver",
  "serializationStatus": "completed",
  "readingStatus": "finished",
  "genres": ["로맨스", "드라마"],
  "coverImage": "/covers/placeholder-1.svg",
  "episodeProgress": "96화 완주",
  "rating": 4.5,
  "review": "후반부 감정선이 좋아서 끝까지 읽기 좋았다.",
  "dropReason": "",
  "startedAt": "2025-02-01",
  "finishedAt": "2025-04-18",
  "updatedAt": "2026-05-25",
  "isFavorite": true,
  "tags": ["감정선", "완결추천"]
}
```
