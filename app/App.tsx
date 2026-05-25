import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

type Screen = "entry" | "guide";

const ratingSteps = [0, 1, 2, 3, 4, 5];

export default function App() {
  const [screen, setScreen] = useState<Screen>("entry");
  const [title, setTitle] = useState("");
  const [rating, setRating] = useState(4);
  const [review, setReview] = useState("");

  const validationMessage = useMemo(() => {
    if (title.trim().length === 0) {
      return "제목을 입력하면 대기열 항목을 만들 수 있어요.";
    }

    if (review.trim().length === 0) {
      return "한줄평을 입력하면 다음 단계에서 GitHub에 올릴 수 있어요.";
    }

    return "입력 준비 완료. GitHub 연결은 다음 티켓에서 붙입니다.";
  }, [review, title]);

  const isReady = title.trim().length > 0 && review.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>WEBTOON QUEUE</Text>
            <Text style={styles.title}>읽는 웹툰 빠른 기록</Text>
            <Text style={styles.description}>
              제목, 별점, 한줄평만 남기고 나중에 Codex가 공식 정보를 채우는
              흐름입니다.
            </Text>
          </View>

          <View style={styles.segmentedControl} accessibilityRole="tablist">
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: screen === "entry" }}
              style={[
                styles.segmentButton,
                screen === "entry" && styles.segmentButtonActive
              ]}
              onPress={() => setScreen("entry")}
            >
              <Text
                style={[
                  styles.segmentText,
                  screen === "entry" && styles.segmentTextActive
                ]}
              >
                입력
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: screen === "guide" }}
              style={[
                styles.segmentButton,
                screen === "guide" && styles.segmentButtonActive
              ]}
              onPress={() => setScreen("guide")}
            >
              <Text
                style={[
                  styles.segmentText,
                  screen === "guide" && styles.segmentTextActive
                ]}
              >
                안내
              </Text>
            </Pressable>
          </View>

          {screen === "entry" ? (
            <View style={styles.panel}>
              <Text style={styles.label}>웹툰 제목</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="예: 역대급 영지 설계사"
                placeholderTextColor="#7f8792"
                returnKeyType="next"
                style={styles.input}
              />

              <Text style={styles.label}>개인 별점</Text>
              <View style={styles.ratingGrid}>
                {ratingSteps.map((ratingValue) => (
                  <Pressable
                    key={ratingValue}
                    accessibilityRole="button"
                    accessibilityState={{ selected: rating === ratingValue }}
                    style={[
                      styles.ratingButton,
                      rating === ratingValue && styles.ratingButtonActive
                    ]}
                    onPress={() => setRating(ratingValue)}
                  >
                    <Text
                      style={[
                        styles.ratingText,
                        rating === ratingValue && styles.ratingTextActive
                      ]}
                    >
                      {ratingValue}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>한줄평</Text>
              <TextInput
                value={review}
                onChangeText={setReview}
                placeholder="읽고 난 감상을 짧게 남겨주세요."
                placeholderTextColor="#7f8792"
                multiline
                style={[styles.input, styles.textarea]}
                textAlignVertical="top"
              />

              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>대기열 미리보기</Text>
                <Text style={styles.previewLine}>제목: {title.trim() || "-"}</Text>
                <Text style={styles.previewLine}>평점: {rating.toFixed(1)}</Text>
                <Text style={styles.previewLine}>
                  후기: {review.trim() || "-"}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled
                style={[
                  styles.submitButton,
                  isReady && styles.submitButtonReady,
                  styles.submitButtonDisabled
                ]}
              >
                <Text style={styles.submitText}>GitHub 연결 후 제출 가능</Text>
              </Pressable>

              <Text style={styles.helperText}>{validationMessage}</Text>
            </View>
          ) : (
            <View style={styles.panel}>
              <Text style={styles.guideTitle}>작동 방식</Text>
              <Text style={styles.guideText}>
                이 앱은 나중에 GitHub API로 queue/pending-webtoons.jsonl에
                JSON Lines 한 줄을 추가합니다.
              </Text>
              <Text style={styles.guideText}>
                앱은 제목, 평점, 한줄평만 저장하고 표지, 작가, 장르, 소개글은
                Codex가 후처리합니다.
              </Text>
              <Text style={styles.guideText}>
                다음 단계에서는 GitHub 토큰과 저장소 설정 화면을 붙입니다.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#222837"
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 36
  },
  header: {
    gap: 8,
    marginBottom: 18
  },
  eyebrow: {
    color: "#ffcf5a",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34
  },
  description: {
    color: "#cbd2df",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 8,
    marginBottom: 14,
    padding: 4,
    backgroundColor: "#151925"
  },
  segmentButton: {
    minHeight: 42,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6
  },
  segmentButtonActive: {
    backgroundColor: "#ff4050"
  },
  segmentText: {
    color: "#b8c1d0",
    fontSize: 15,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: "#ffffff"
  },
  panel: {
    borderColor: "#303747",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    backgroundColor: "#171b27"
  },
  label: {
    marginBottom: 8,
    color: "#eef2f7",
    fontSize: 14,
    fontWeight: "900"
  },
  input: {
    minHeight: 48,
    borderColor: "#566071",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 18,
    paddingHorizontal: 12,
    color: "#ffffff",
    backgroundColor: "#202635",
    fontSize: 16,
    fontWeight: "700"
  },
  textarea: {
    minHeight: 112,
    paddingTop: 12,
    lineHeight: 22
  },
  ratingGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18
  },
  ratingButton: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#566071",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#202635"
  },
  ratingButtonActive: {
    borderColor: "#ffcf5a",
    backgroundColor: "#ffcf5a"
  },
  ratingText: {
    color: "#dce1ea",
    fontSize: 15,
    fontWeight: "900"
  },
  ratingTextActive: {
    color: "#151924"
  },
  previewBox: {
    gap: 6,
    borderColor: "#303747",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12,
    backgroundColor: "#202635"
  },
  previewTitle: {
    color: "#ffcf5a",
    fontSize: 13,
    fontWeight: "900"
  },
  previewLine: {
    color: "#d5dbe6",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  submitButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#3a4253"
  },
  submitButtonReady: {
    backgroundColor: "#e93449"
  },
  submitButtonDisabled: {
    opacity: 0.64
  },
  submitText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  helperText: {
    marginTop: 10,
    color: "#aeb7c6",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19
  },
  guideTitle: {
    marginBottom: 10,
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900"
  },
  guideText: {
    marginBottom: 12,
    color: "#d5dbe6",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23
  },
});
