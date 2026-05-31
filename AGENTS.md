# Codex 작업 지침

## 커밋 메시지 규칙

- 모든 커밋 메시지는 Conventional Commits 형식을 따른다.
- 형식은 `<type>: <한글 요약>`으로 작성한다.
- 콜론 뒤 요약은 반드시 한글로 작성한다.
- 커밋 본문을 작성할 때도 세부 내용은 한글로 작성한다.
- 코드 식별자, 파일명, 패키지명, 명령어는 필요한 경우 영어를 그대로 쓸 수 있다.

## 예외

- 모바일 입력 앱이 GitHub Contents API로 `queue/pending-webtoons.jsonl`만 갱신할 때는 자동 커밋 메시지 `update`를 사용한다.
- Codex나 사람이 직접 만드는 저장소 작업 커밋에는 이 예외를 적용하지 않는다.

## 허용 타입

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `chore`: 설정, 의존성, 빌드 산출물 관리 등 사용자 기능과 직접 관련 없는 작업
- `refactor`: 동작 변화 없는 구조 개선
- `test`: 테스트 추가 또는 수정
- `style`: 포맷팅, 스타일만 변경
- `build`: 빌드 시스템 또는 패키징 변경
- `ci`: CI 설정 변경
- `perf`: 성능 개선
- `revert`: 이전 커밋 되돌리기

## 예시

- `feat: 웹툰 기록 페이지 초기 구현`
- `docs: 웹툰 입력 컨벤션 문서 추가`
- `chore: 개발 서버 설정 정리`
- `fix: 장르 필터 초기화 오류 수정`

## 금지 예시

- `update files`
- `initial commit`
- `feat: add webtoon page`
- `docs: update docs`
