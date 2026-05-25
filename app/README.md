# Webtoon Queue App

핸드폰에서 웹툰 제목, 개인 별점, 한줄평을 입력해 GitHub 대기열 파일에 커밋하는 React Native 앱입니다.

Expo 기반으로 동작하며, 서버나 LLM API를 사용하지 않습니다.

## 실행

```bash
cd app
npm install
npm start
```

Expo 개발 서버가 뜨면 핸드폰의 Expo Go 앱으로 QR 코드를 스캔합니다.

## 설치형 Android 앱 빌드

Expo Go 없이 핸드폰에 APK를 설치하려면 EAS preview build를 사용합니다.

```bash
cd app
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

빌드가 끝나면 Expo가 APK 다운로드 링크를 제공합니다. 자세한 절차는 [../docs/mobile-app-build.md](../docs/mobile-app-build.md)를 봅니다.

## 앱 화면

- `입력`: 웹툰 제목, 별점, 한줄평 입력 및 GitHub 대기열 제출
- `설정`: GitHub owner, repo, branch, queue path, fine-grained PAT 저장
- `안내`: 앱의 동작 방식 확인

## GitHub 토큰 설정

Fine-grained personal access token을 권장합니다.

- Repository access: `cyh000127/webtoon_review`
- Repository permissions: `Contents` Read and write
- 저장 위치: Expo SecureStore

토큰은 저장소에 커밋하지 않습니다. 앱 설정 화면에서 직접 입력하고, 필요하면 삭제할 수 있습니다.

## 제출 결과

제출에 성공하면 아래 파일에 JSON Lines 한 줄이 추가되는 커밋이 생성됩니다.

```text
queue/pending-webtoons.jsonl
```

커밋 메시지:

```text
chore: 웹툰 대기열 추가
```

## 검증

앱 타입 검사:

```bash
cd app
npm run typecheck
```

루트 대기열 검증:

```bash
npm run validate:queue
```
