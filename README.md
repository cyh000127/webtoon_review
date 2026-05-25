# Webtoon Review

개인 웹툰 감상 기록을 정리하는 TypeScript 기반 웹 페이지입니다.  
불법 공유나 외부 감상 링크 제공 목적이 아니라, 사용자가 읽은 웹툰의 상태, 평점, 한줄평, 중도 포기 사유를 정리하는 로컬 아카이브입니다.

## 주요 기능

- 연재중/완결 기준 작품 분류
- 전체/읽는 중/완주/중도 포기 감상 상태 필터
- 제목, 작가, 장르, 플랫폼 검색
- 플랫폼, 장르, 제작자 평점 필터
- 등록순, 제작자 평점순, 화수순, 가나다순 정렬
- 카드 보기와 목록 보기 전환
- 상세 패널에서 작품 소개, 제작자 후기, 중도 포기 사유, 장르, note 확인
- 같은 브라우저 기준 독자 평점 저장 및 수정
- 제작자 평균, 독자 평균, 완주율, 상태/장르/평점 분포 통계 대시보드

## 기술 스택

- React
- TypeScript
- Vite
- lucide-react
- JSON 기반 정적 데이터
- GitHub REST API 기반 모바일 대기열 계획

## 실행

```bash
npm install
npm run dev
```

로컬 개발 서버 기본 주소:

```text
http://127.0.0.1:5173/
```

프로덕션 빌드:

```bash
npm run build
```

빌드 결과 미리보기:

```bash
npm run preview
```

## 데이터 구조

```text
webtoons/
  webtoons.json
  webtoons.xml
  covers/
  description/
```

- `webtoons/webtoons.json`: 앱이 직접 읽는 데이터
- `webtoons/webtoons.xml`: 보존용 XML 데이터
- `webtoons/covers`: 작품 표지 이미지
- `webtoons/description`: 작품별 소개, 평점, 한줄평 텍스트

현재 아카이브는 43개 작품, 표지 43개, 설명 파일 43개로 구성되어 있습니다.

## 웹툰 추가 흐름

새 웹툰을 추가할 때는 아래 순서를 따릅니다.

1. 공식/공개 페이지에서 표지를 찾아 `webtoons/covers/세자리ID.확장자`로 저장합니다.
2. 공식/공개 페이지 기준 제목, 작가, 장르, 소개글, 연재 상태, 회차 수를 확인합니다.
3. 사용자의 감상 상태, 진행도, 별점, 한줄평 또는 중도 포기 사유를 기록합니다.
4. `webtoons/webtoons.json`, `webtoons/webtoons.xml`, `webtoons/description/세자리ID.txt`를 함께 수정합니다.
5. 검증 명령을 실행합니다.

```bash
npm run validate:webtoons
```

자세한 입력 규칙은 [docs/webtoon-data-convention.md](docs/webtoon-data-convention.md)를 봅니다.

## 모바일 입력 앱 계획

핸드폰에서 제목, 별점, 한줄평만 빠르게 입력한 뒤 GitHub 저장소의 대기열 파일에 커밋하는 앱을 계획하고 있습니다.

- 입력 앱은 `queue/pending-webtoons.jsonl`만 수정합니다.
- 정식 표지, 작가, 장르, 소개글 보강은 나중에 Codex가 처리합니다.
- 서버와 LLM API 없이 GitHub REST API로 queue 파일 수정 커밋을 만듭니다.

구현 순서와 티켓은 [docs/mobile-queue-app-plan.md](docs/mobile-queue-app-plan.md)를 봅니다.  
대기열 파일 규칙은 [docs/webtoon-queue-convention.md](docs/webtoon-queue-convention.md)를 봅니다.

## 문서

- [작업 정의](docs/webtoon-review-spec.md)
- [웹툰 데이터 입력 컨벤션](docs/webtoon-data-convention.md)
- [모바일 큐 앱 구현 계획](docs/mobile-queue-app-plan.md)
- [웹툰 대기열 컨벤션](docs/webtoon-queue-convention.md)
- [커밋 메시지 컨벤션](docs/commit-convention.md)
- [웹툰 아카이브 안내](webtoons/README.md)

## 저장 방식

작품 데이터는 저장소의 JSON/XML/이미지 파일로 관리합니다.  
독자 평점은 서버나 DB 없이 브라우저 `localStorage`에 저장됩니다.

같은 브라우저에서는 작품 ID별로 평점이 하나만 저장되며, 다시 평가하면 기존 값이 수정됩니다. 여러 방문자의 점수를 전역으로 합산하려면 별도 백엔드나 외부 저장소가 필요합니다.

## 배포 참고

현재 앱은 정적 Vite 앱입니다. GitHub Pages에 배포하려면 Pages 설정 또는 GitHub Actions workflow가 별도로 필요합니다. 저장소 경로 기반 Pages URL을 사용할 경우 Vite `base` 설정도 함께 확인해야 합니다.
