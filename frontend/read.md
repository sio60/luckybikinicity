# 0) 작업 폴더로 이동
cd C:\Users\C111\Desktop\wonyoung\luckybikinicity

# 1) React Native(Expo) JS 프로젝트 생성
npx create-expo-app@latest frontend --template blank
cd frontend

# 2) (추천) Picker 쓸 거면 미리 설치
npm i @react-native-picker/picker

# 3) 로컬 실행 (QR 테스트)
npm run start

# 4) EAS 설치/로그인
npm i -g eas-cli
eas login

# 5) EAS 프로젝트 연결(자동으로 app/eas 파일 생성/설정)
eas build:configure

# 6) 안드로이드 APK 빌드(미리보기용)
eas build -p android --profile preview

# 7) 최신 빌드 로그 열기(에러 확인용)
eas build:view --latest --platform android --open
npm i @react-native-picker/picker
eas build -p android --profile preview --clear-cache


# install
npm i @react-navigation/native @react-navigation/native-stack
npm i react-native-screens react-native-safe-area-context
npm i expo-font expo-linking expo-secure-store
npm i react-native-paper
npm i react-native-safe-area-context
npx expo install react-native-gesture-handler
