# 모바일 앱 설치 빌드

## 목표

`app/`의 React Native 앱을 Expo Go 없이 핸드폰에 설치 가능한 빌드로 만든다.

1차 목표는 Android APK preview build다.  
iOS 설치 빌드는 Apple Developer 계정, 기기 등록, TestFlight 또는 ad hoc 설정이 필요하므로 후속으로 다룬다.

## 사전 준비

- Expo 계정
- `app/` 프로젝트 의존성 설치
- Android 기기에서 알 수 없는 앱 설치 허용

```bash
cd app
npm install
```

## Expo 로그인

```bash
cd app
npx eas-cli@latest login
npx eas-cli@latest whoami
```

## Android APK 빌드

```bash
cd app
npx eas-cli@latest build -p android --profile preview
```

`preview` 프로필은 `app/eas.json`에서 Android `buildType`을 `apk`로 지정한다.  
빌드가 끝나면 Expo가 APK 다운로드 링크를 제공한다.

## 핸드폰 설치

1. 빌드 완료 후 출력되는 APK 링크를 핸드폰에서 연다.
2. APK 파일을 다운로드한다.
3. Android가 설치 확인을 요청하면 허용한다.
4. 앱을 열고 `설정` 탭에서 GitHub 정보를 저장한다.

## GitHub 제출 확인

앱에서 웹툰을 제출한 뒤 아래 파일에 새 JSON Lines 항목이 커밋됐는지 확인한다.

```text
queue/pending-webtoons.jsonl
```

## 참고

Expo 공식 문서 기준으로 Android APK 빌드는 `eas.json`의 build profile에 `android.buildType: "apk"`를 지정한다.

- [Expo APK builds](https://docs.expo.dev/build-reference/apk/)
- [Expo eas.json configuration](https://docs.expo.dev/build/eas-json/)
