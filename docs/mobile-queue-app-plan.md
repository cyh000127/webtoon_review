# 모바일 웹툰 입력 앱 구현 계획

## 목표

핸드폰에서 웹툰 제목, 개인 별점, 한줄평만 빠르게 입력하고 GitHub 저장소의 대기열 파일에 커밋으로 남기는 모바일 입력 앱을 만든다.

이 앱은 공식 표지, 작가, 장르, 작품 소개를 찾지 않는다.  
정식 아카이브 반영은 나중에 Codex가 저장소를 pull/fetch한 뒤 `docs/webtoon-queue-convention.md`와 `docs/webtoon-data-convention.md` 규칙대로 처리한다.

## 핵심 원칙

- 서버를 만들지 않는다.
- LLM API를 호출하지 않는다.
- 핸드폰에서 동작해야 하므로 브라우저 기반 모바일 화면을 우선한다.
- 브라우저에서 `git` CLI를 실행하지 않고 GitHub REST API로 파일 수정 커밋을 만든다.
- GitHub 토큰은 저장소에 커밋하지 않고 사용자 브라우저 저장소에만 보관한다.
- 입력 앱은 대기열 파일만 수정한다. 정식 웹툰 데이터는 Codex 처리 단계에서만 수정한다.

## 권장 아키텍처

```text
Mobile browser
  ↓
Webtoon Queue App
  ↓ GitHub REST API
queue/pending-webtoons.jsonl
  ↓ 나중에 Codex가 pull/fetch
webtoons/webtoons.json
webtoons/webtoons.xml
webtoons/covers/*
webtoons/description/*
```

## GitHub 연동 방식

GitHub 공식 Repository contents API를 사용한다.

1. `GET /repos/{owner}/{repo}/contents/{path}`로 현재 `queue/pending-webtoons.jsonl` 내용을 읽는다.
2. 파일이 있으면 응답의 `sha`를 보관한다.
3. 새 입력값을 JSON Lines 한 줄로 append한다.
4. 전체 파일 내용을 Base64로 인코딩한다.
5. `PUT /repos/{owner}/{repo}/contents/{path}`로 파일을 갱신한다.
6. 커밋 메시지는 `chore: 웹툰 대기열 추가`를 사용한다.

GitHub 공식 문서 기준으로 파일 업데이트 시 새 파일 content는 Base64 인코딩이 필요하고, 기존 파일 업데이트에는 교체 대상 파일의 `sha`가 필요하다.

참고 문서:

- [GitHub REST API - Repository contents](https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28)
- [GitHub personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

## 토큰 정책

초기 구현은 Fine-grained personal access token을 전제로 한다.

- Repository access: `cyh000127/webtoon_review`만 선택
- Repository permissions: `Contents` Read and write
- 토큰은 앱 설정 화면에서 사용자가 직접 입력한다.
- 토큰은 `localStorage` 또는 모바일 앱 내부 저장소에만 저장한다.
- 토큰은 화면에 기본적으로 마스킹해서 보여준다.
- 토큰 삭제 버튼을 제공한다.

보안상 더 좋은 후속안은 GitHub OAuth device flow 또는 GitHub App이지만, 서버 없는 개인용 앱이라는 조건에서는 PAT 방식이 가장 단순하다.

## 구현 티켓

| 티켓 | 제목 | 선행 | 산출물 |
| --- | --- | --- | --- |
| WTQ-001 | 모바일 큐 앱 계획과 대기열 컨벤션 문서화 | 없음 | docs |
| WTQ-002 | 대기열 파일과 검증 스크립트 추가 | WTQ-001 | `queue/*`, validator |
| WTQ-003 | 모바일 입력 화면 라우팅과 기본 UI 추가 | WTQ-002 | 입력 화면 |
| WTQ-004 | GitHub 설정 저장 화면 추가 | WTQ-003 | 토큰/저장소 설정 |
| WTQ-005 | GitHub Contents API 클라이언트 구현 | WTQ-004 | read/update client |
| WTQ-006 | 제목/평점/한줄평 제출 플로우 구현 | WTQ-005 | 대기열 append |
| WTQ-007 | 제출 상태, 실패 복구, 중복 방지 UX 구현 | WTQ-006 | 상태 화면 |
| WTQ-008 | Codex 대기열 처리 워크플로우 문서화 | WTQ-002 | 처리 절차 |
| WTQ-009 | 대기열 항목을 정식 아카이브로 반영 | WTQ-008 | archive update |
| WTQ-010 | 모바일 QA와 배포/접근 방식 정리 | WTQ-007 | QA notes |

## 티켓 상세

### WTQ-001 모바일 큐 앱 계획과 대기열 컨벤션 문서화

목표: 전체 방향을 문서로 확정한다.

작업:

- 모바일 앱 목표와 제약 조건을 정리한다.
- GitHub API 기반 커밋 방식을 문서화한다.
- 대기열 파일 형식과 Codex 처리 규칙을 문서화한다.
- 구현 티켓 순서를 만든다.

완료 기준:

- `docs/mobile-queue-app-plan.md`가 있다.
- `docs/webtoon-queue-convention.md`가 있다.
- README에서 관련 문서로 이동할 수 있다.

### WTQ-002 대기열 파일과 검증 스크립트 추가

목표: 앱이 쓸 queue 저장소를 만든다.

작업:

- `queue/pending-webtoons.jsonl`을 추가한다.
- `queue/processed-webtoons.jsonl`을 추가한다.
- JSON Lines 형식을 검증하는 스크립트를 추가한다.
- `package.json`에 `validate:queue` 스크립트를 추가한다.

완료 기준:

- 빈 대기열도 검증에 성공한다.
- 잘못된 평점과 빈 제목은 검증 실패한다. 후기는 저장할 수 있지만 화면 노출 필수값으로 다루지 않는다.

### WTQ-003 모바일 입력 화면 라우팅과 기본 UI 추가

목표: 핸드폰에서 입력하기 좋은 화면을 만든다.

작업:

- 기존 앱 안에 큐 입력 화면을 추가한다.
- 제목 input, 평점 선택, 한줄평 textarea를 만든다.
- 모바일 360px 폭에서도 버튼과 텍스트가 겹치지 않게 한다.
- 정식 아카이브 화면과 큐 입력 화면을 오갈 수 있게 한다.

완료 기준:

- 로컬 브라우저에서 입력 화면에 접근할 수 있다.
- 입력 전송 전에는 GitHub API를 호출하지 않는다.

### WTQ-004 GitHub 설정 저장 화면 추가

목표: 사용자가 핸드폰에서 GitHub 연동 값을 저장할 수 있게 한다.

작업:

- owner, repo, branch, token, queue path 입력을 받는다.
- 기본값은 `cyh000127`, `webtoon_review`, `main`, `queue/pending-webtoons.jsonl`로 둔다.
- 토큰 저장, 토큰 삭제, 연결 테스트 버튼을 만든다.
- 토큰은 화면에서 마스킹한다.

완료 기준:

- 새로고침 후에도 설정이 유지된다.
- 토큰 삭제 후에는 제출이 막힌다.

### WTQ-005 GitHub Contents API 클라이언트 구현

목표: queue 파일을 읽고 갱신하는 API 레이어를 만든다.

작업:

- queue 파일 GET 함수 구현
- queue 파일 PUT 함수 구현
- 기존 파일이 없는 경우 새 파일 생성 처리
- 409 conflict 발생 시 한 번 다시 읽고 재시도
- GitHub API 에러 메시지를 사용자가 이해할 수 있게 변환

완료 기준:

- 대기열 파일이 없는 저장소에서도 첫 제출로 파일이 생성된다.
- 기존 파일이 있으면 기존 내용을 보존하고 새 줄만 append한다.

### WTQ-006 제목/평점/한줄평 제출 플로우 구현

목표: 앱에서 입력 완료 시 대기열 커밋을 만든다.

작업:

- 제목 필수 검증
- 평점 0부터 5까지 범위 검증
- 한줄평 필수 검증
- 제출 payload를 JSONL 한 줄로 만든다.
- 커밋 메시지 `chore: 웹툰 대기열 추가`로 GitHub에 반영한다.

완료 기준:

- 제출 후 GitHub 저장소의 `queue/pending-webtoons.jsonl`에 한 줄이 추가된다.
- 제출 성공 시 입력값이 초기화된다.

### WTQ-007 제출 상태, 실패 복구, 중복 방지 UX 구현

목표: 핸드폰에서 실수 없이 쓸 수 있게 한다.

작업:

- 제출 중 버튼 비활성화
- 성공/실패 상태 표시
- 같은 제목을 연속 제출하려 하면 확인을 요구한다.
- 최근 제출 목록을 로컬에 표시한다.
- 네트워크 실패 시 입력값을 유지한다.

완료 기준:

- 중복 터치로 같은 항목이 여러 번 올라가지 않는다.
- 실패 후 다시 제출할 수 있다.

### WTQ-008 Codex 대기열 처리 워크플로우 문서화

목표: 나중에 Codex가 대기열을 보고 정식 아카이브에 반영하는 규칙을 확정한다.

작업:

- pending 항목 읽는 순서를 정한다.
- 공식/공개 정보 수집 범위를 정한다.
- 표지 저장, JSON/XML/description 갱신 절차를 정한다.
- 처리 완료 항목을 processed로 옮기는 규칙을 정한다.

완료 기준:

- Codex가 `docs/codex-queue-processing-workflow.md`만 보고 pending 항목을 정식 아카이브로 옮길 수 있다.

### WTQ-009 대기열 항목을 정식 아카이브로 반영

목표: 실제 pending 항목을 처리한다.

작업:

- `git pull` 후 pending 항목을 확인한다.
- 공식 표지, 작가, 장르, 소개글, 연재 상태, 회차 수를 찾는다.
- `webtoons.json`, `webtoons.xml`, `covers`, `description`을 업데이트한다.
- pending 항목을 processed로 이동한다.
- 검증 후 커밋/푸시한다.

완료 기준:

- 정식 아카이브에 새 작품이 보인다.
- pending 항목은 중복 처리되지 않는다.

### WTQ-010 모바일 QA와 배포/접근 방식 정리

목표: 실제 핸드폰에서 쓰기 편한지 확인한다.

작업:

- 모바일 브라우저 화면 확인
- 토큰 저장/삭제 확인
- 제출 성공/실패 케이스 확인
- GitHub Pages 또는 로컬 네트워크 접근 중 사용할 방식을 문서화한다.

완료 기준:

- 핸드폰에서 입력부터 GitHub 커밋 생성까지 완료된다.
- `app/README.md`와 `docs/mobile-queue-app-qa.md`에 사용 방법과 QA 절차가 정리된다.
