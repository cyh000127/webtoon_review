# 커밋 메시지 컨벤션

이 저장소의 커밋 메시지는 항상 Conventional Commits 형식을 사용한다.  
커밋 제목과 본문의 설명은 한글로 작성한다.

## 기본 형식

```text
<type>: <한글 요약>

<한글 상세 설명>
```

## 허용 타입

| 타입 | 용도 |
| --- | --- |
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 추가, 수정 |
| `chore` | 설정, 의존성, 개발 환경 정리 |
| `refactor` | 동작 변경 없는 코드 구조 개선 |
| `test` | 테스트 추가 또는 수정 |
| `style` | 포맷팅, CSS 등 스타일 변경 |
| `build` | 빌드 설정 또는 번들링 관련 변경 |
| `ci` | CI 설정 변경 |
| `perf` | 성능 개선 |
| `revert` | 이전 커밋 되돌리기 |
| `update` | 모바일 입력 앱의 웹툰 대기열 자동 갱신 |

## 작성 규칙

- 커밋 제목은 `<type>: <한글 요약>` 형식으로 작성한다.
- `:` 뒤에는 공백 하나를 둔다.
- 요약은 한글 문장으로 작성한다.
- 상세 본문을 작성한다면 본문도 한글로 작성한다.
- 파일명, 명령어, 패키지명, 타입명, 앱 자동 커밋 식별자처럼 코드 맥락에서 필요한 단어는 영어를 허용한다.
- 의미가 모호한 `update`, `changes`, `initial commit` 같은 메시지는 사용하지 않는다.

## 앱 자동 커밋

- 모바일 입력 앱이 GitHub Contents API로 `queue/pending-webtoons.jsonl`만 갱신할 때는 `update: webtoon`을 사용한다.
- `update` 타입은 이 자동 커밋 용도로만 사용한다.

## 좋은 예시

```text
feat: 웹툰 기록 페이지 초기 구현
```

```text
docs: 웹툰 JSON 입력 컨벤션 추가
```

```text
chore: Vite 개발 환경 설정 정리
```

```text
fix: 중도 포기 탭의 사유 표시 오류 수정
```

## 나쁜 예시

```text
update files
```

```text
initial commit
```

```text
feat: add webtoon review page
```

```text
docs: update docs
```
