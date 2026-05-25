# 모바일 큐 앱 QA 체크리스트

## 로컬 검증

필수 명령:

```bash
npm run validate:queue
npm run validate:webtoons
cd app
npm run typecheck
```

## 실제 기기 확인

Expo Go로 확인한다.

1. `cd app && npm start`를 실행한다.
2. 핸드폰에서 Expo Go로 QR 코드를 스캔한다.
3. `입력` 탭에서 제목, 별점, 한줄평을 입력한다.
4. GitHub 설정이 없을 때 제출 버튼이 막히는지 확인한다.
5. `설정` 탭에서 owner, repo, branch, queue path, token을 저장한다.
6. `연결 테스트`가 성공 메시지를 보여주는지 확인한다.
7. `입력` 탭에서 제출한다.
8. GitHub 저장소의 `queue/pending-webtoons.jsonl`에 한 줄이 추가됐는지 확인한다.
9. 같은 제목을 바로 다시 제출할 때 확인 알림이 뜨는지 확인한다.
10. 제출 성공 후 최근 제출 목록에 항목이 표시되는지 확인한다.

## 실패 케이스

- 토큰이 없으면 제출하지 못해야 한다.
- 잘못된 토큰이면 GitHub API 오류 메시지를 보여줘야 한다.
- 네트워크 실패 시 입력값이 유지되어야 한다.
- 제목 또는 한줄평이 비어 있으면 제출하지 못해야 한다.
- 중복 터치로 같은 입력이 여러 번 올라가지 않아야 한다.

## 현재 자동 확인 범위

현재 작업에서 자동으로 확인한 범위:

- queue 검증 스크립트 통과
- 웹툰 아카이브 검증 스크립트 통과
- React Native 앱 TypeScript 검사 통과

실제 핸드폰 QR 실행과 GitHub 토큰 제출 테스트는 사용자 기기와 토큰이 필요하다.
