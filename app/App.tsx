import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import {
  appendQueueLine,
  testGitHubConnection,
  type GitHubQueueSettings
} from "./src/githubClient";
import { createQueueEntry, serializeQueueEntry } from "./src/queueEntry";

type Screen = "entry" | "settings" | "guide";

const ratingSteps = [0, 1, 2, 3, 4, 5];
const settingsStorageKey = "webtoon-queue-github-settings-v1";
const tokenStorageKey = "webtoon-queue-github-token-v1";
const recentSubmissionsStorageKey = "webtoon-queue-recent-submissions-v1";
const defaultSettings: GitHubQueueSettings = {
  owner: "cyh000127",
  repo: "webtoon_review",
  branch: "main",
  queuePath: "queue/pending-webtoons.jsonl"
};

function parseRatingInput(value: string) {
  const normalized = value.replace(",", ".").trim();

  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) {
    return null;
  }

  return parsed;
}

function formatRating(value: number) {
  const rounded = Math.round(value * 100) / 100;

  return Number.isInteger(rounded) ? rounded.toFixed(1) : String(rounded);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("entry");
  const [title, setTitle] = useState("");
  const [ratingInput, setRatingInput] = useState("4.0");
  const [review, setReview] = useState("");
  const [settings, setSettings] = useState<GitHubQueueSettings>(defaultSettings);
  const [tokenInput, setTokenInput] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [recentSubmissions, setRecentSubmissions] = useState<
    Array<{
      createdAt: string;
      id: string;
      rating: number;
      review: string;
      title: string;
    }>
  >([]);
  const [settingsMessage, setSettingsMessage] = useState("설정을 불러오는 중입니다.");

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const storedSettings = await SecureStore.getItemAsync(settingsStorageKey);
        const storedToken = await SecureStore.getItemAsync(tokenStorageKey);

        if (!mounted) {
          return;
        }

        if (storedSettings) {
          setSettings({ ...defaultSettings, ...JSON.parse(storedSettings) });
        }

        setHasToken(Boolean(storedToken));
        setSettingsMessage(
          storedToken
            ? "GitHub 토큰이 저장되어 있습니다."
            : "GitHub 토큰을 저장해야 제출할 수 있습니다."
        );

        const storedRecent = await SecureStore.getItemAsync(
          recentSubmissionsStorageKey
        );

        if (storedRecent) {
          setRecentSubmissions(JSON.parse(storedRecent));
        }
      } catch {
        if (mounted) {
          setSettingsMessage("설정을 불러오지 못했습니다. 다시 저장해 주세요.");
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const parsedRating = useMemo(() => parseRatingInput(ratingInput), [ratingInput]);
  const isRatingValid = parsedRating !== null;

  const validationMessage = useMemo(() => {
    if (title.trim().length === 0) {
      return "제목을 입력하면 대기열 항목을 만들 수 있어요.";
    }

    if (!isRatingValid) {
      return "별점은 0부터 5 사이 숫자로 입력해 주세요.";
    }

    if (review.trim().length === 0) {
      return "한줄평을 입력하면 다음 단계에서 GitHub에 올릴 수 있어요.";
    }

    return "입력 준비 완료. GitHub 연결은 다음 티켓에서 붙입니다.";
  }, [isRatingValid, review, title]);

  const isReady =
    title.trim().length > 0 && review.trim().length > 0 && isRatingValid;
  const isSettingsReady =
    settings.owner.trim().length > 0 &&
    settings.repo.trim().length > 0 &&
    settings.branch.trim().length > 0 &&
    settings.queuePath.trim().length > 0 &&
    hasToken;

  const saveSettings = async () => {
    const trimmedSettings = {
      owner: settings.owner.trim(),
      repo: settings.repo.trim(),
      branch: settings.branch.trim(),
      queuePath: settings.queuePath.trim()
    };

    if (
      !trimmedSettings.owner ||
      !trimmedSettings.repo ||
      !trimmedSettings.branch ||
      !trimmedSettings.queuePath
    ) {
      setSettingsMessage("owner, repo, branch, queue path를 모두 입력해 주세요.");
      return;
    }

    try {
      await SecureStore.setItemAsync(
        settingsStorageKey,
        JSON.stringify(trimmedSettings)
      );

      if (tokenInput.trim()) {
        await SecureStore.setItemAsync(tokenStorageKey, tokenInput.trim());
        setHasToken(true);
        setTokenInput("");
      }

      setSettings(trimmedSettings);
      setSettingsMessage(
        tokenInput.trim()
          ? "GitHub 설정과 토큰을 저장했습니다."
          : hasToken
            ? "GitHub 설정을 저장했습니다. 기존 토큰을 유지합니다."
            : "GitHub 설정을 저장했습니다. 토큰은 아직 없습니다."
      );
    } catch {
      setSettingsMessage("설정을 저장하지 못했습니다.");
    }
  };

  const deleteToken = async () => {
    try {
      await SecureStore.deleteItemAsync(tokenStorageKey);
      setHasToken(false);
      setTokenInput("");
      setSettingsMessage("저장된 GitHub 토큰을 삭제했습니다.");
    } catch {
      setSettingsMessage("토큰을 삭제하지 못했습니다.");
    }
  };

  const checkConnection = async () => {
    if (isSettingsReady) {
      setIsTestingConnection(true);
      setSettingsMessage("GitHub 연결을 확인하는 중입니다.");

      try {
        const token = await SecureStore.getItemAsync(tokenStorageKey);

        if (!token) {
          setHasToken(false);
          setSettingsMessage("저장된 토큰이 없습니다.");
          return;
        }

        const message = await testGitHubConnection(settings, token);
        setSettingsMessage(message);
      } catch (error) {
        setSettingsMessage(
          error instanceof Error ? error.message : "GitHub 연결에 실패했습니다."
        );
      } finally {
        setIsTestingConnection(false);
      }

      return;
    }

    setSettingsMessage("저장소 설정과 토큰을 모두 준비해 주세요.");
  };

  const saveRecentSubmissions = async (
    submissions: typeof recentSubmissions
  ) => {
    const nextSubmissions = submissions.slice(0, 5);
    setRecentSubmissions(nextSubmissions);
    await SecureStore.setItemAsync(
      recentSubmissionsStorageKey,
      JSON.stringify(nextSubmissions)
    );
  };

  const submitQueueEntry = async (allowDuplicateTitle = false) => {
    const trimmedTitle = title.trim();
    const trimmedReview = review.trim();

    if (!trimmedTitle || !trimmedReview) {
      setSubmitMessage("제목과 한줄평을 모두 입력해 주세요.");
      return;
    }

    if (parsedRating === null) {
      setSubmitMessage("별점은 0부터 5 사이 숫자로 입력해 주세요.");
      return;
    }

    if (!isSettingsReady) {
      setSubmitMessage("설정 탭에서 GitHub 저장소와 토큰을 먼저 저장해 주세요.");
      return;
    }

    const lastSubmission = recentSubmissions[0];

    if (
      !allowDuplicateTitle &&
      lastSubmission?.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
    ) {
      Alert.alert(
        "같은 제목을 방금 제출했어요",
        "그래도 한 번 더 대기열에 추가할까요?",
        [
          {
            style: "cancel",
            text: "취소"
          },
          {
            onPress: () => submitQueueEntry(true),
            text: "제출"
          }
        ]
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("GitHub 대기열에 올리는 중입니다.");

    try {
      const token = await SecureStore.getItemAsync(tokenStorageKey);

      if (!token) {
        setHasToken(false);
        setSubmitMessage("저장된 토큰이 없습니다. 설정 탭에서 토큰을 저장해 주세요.");
        return;
      }

      const entry = createQueueEntry({
        rating: parsedRating,
        review: trimmedReview,
        title: trimmedTitle
      });

      await appendQueueLine({
        line: serializeQueueEntry(entry),
        message: "chore: 웹툰 대기열 추가",
        settings,
        token
      });

      await saveRecentSubmissions([entry, ...recentSubmissions]);
      setTitle("");
      setRatingInput("4.0");
      setReview("");
      setSubmitMessage(`${entry.title}을(를) 대기열에 추가했습니다.`);
    } catch (error) {
      setSubmitMessage(
        error instanceof Error
          ? error.message
          : "대기열 제출 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
              accessibilityState={{ selected: screen === "settings" }}
              style={[
                styles.segmentButton,
                screen === "settings" && styles.segmentButtonActive
              ]}
              onPress={() => setScreen("settings")}
            >
              <Text
                style={[
                  styles.segmentText,
                  screen === "settings" && styles.segmentTextActive
                ]}
              >
                설정
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
              <TextInput
                value={ratingInput}
                onChangeText={setRatingInput}
                keyboardType="decimal-pad"
                placeholder="예: 4.7"
                placeholderTextColor="#7f8792"
                style={[
                  styles.input,
                  styles.ratingInput,
                  !isRatingValid && styles.inputError
                ]}
              />
              <Text style={styles.ratingHelper}>
                0부터 5 사이 숫자를 직접 입력하거나 빠른 선택을 눌러요.
              </Text>
              <View style={styles.ratingGrid}>
                {ratingSteps.map((ratingValue) => (
                  <Pressable
                    key={ratingValue}
                    accessibilityRole="button"
                    accessibilityState={{ selected: parsedRating === ratingValue }}
                    style={[
                      styles.ratingButton,
                      parsedRating === ratingValue && styles.ratingButtonActive
                    ]}
                    onPress={() => setRatingInput(ratingValue.toFixed(1))}
                  >
                    <Text
                      style={[
                        styles.ratingText,
                        parsedRating === ratingValue && styles.ratingTextActive
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
                <Text style={styles.previewLine}>
                  평점: {parsedRating === null ? "-" : formatRating(parsedRating)}
                </Text>
                <Text style={styles.previewLine}>
                  후기: {review.trim() || "-"}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={!isReady || !isSettingsReady || isSubmitting}
                style={[
                  styles.submitButton,
                  isReady && isSettingsReady && styles.submitButtonReady,
                  (!isReady || !isSettingsReady || isSubmitting) &&
                    styles.submitButtonDisabled
                ]}
                onPress={() => submitQueueEntry()}
              >
                <Text style={styles.submitText}>
                  {isSubmitting
                    ? "제출 중"
                    : isSettingsReady
                      ? "GitHub 대기열에 추가"
                      : "GitHub 설정 후 제출 가능"}
                </Text>
              </Pressable>

              <Text style={styles.helperText}>{validationMessage}</Text>
              {submitMessage && (
                <Text style={styles.submitMessage}>{submitMessage}</Text>
              )}
              {!isSettingsReady && (
                <Text style={styles.helperText}>
                  설정 탭에서 저장소 정보와 토큰을 먼저 저장해 주세요.
                </Text>
              )}

              {recentSubmissions.length > 0 && (
                <View style={styles.recentBox}>
                  <Text style={styles.previewTitle}>최근 제출</Text>
                  {recentSubmissions.map((submission) => (
                    <View key={submission.id} style={styles.recentItem}>
                      <Text style={styles.recentTitle}>{submission.title}</Text>
                      <Text style={styles.recentMeta}>
                        {submission.rating.toFixed(1)}점 · {submission.review}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : screen === "settings" ? (
            <View style={styles.panel}>
              <Text style={styles.label}>GitHub owner</Text>
              <TextInput
                value={settings.owner}
                onChangeText={(owner) => setSettings((current) => ({ ...current, owner }))}
                autoCapitalize="none"
                placeholder="cyh000127"
                placeholderTextColor="#7f8792"
                style={styles.input}
              />

              <Text style={styles.label}>Repository</Text>
              <TextInput
                value={settings.repo}
                onChangeText={(repo) => setSettings((current) => ({ ...current, repo }))}
                autoCapitalize="none"
                placeholder="webtoon_review"
                placeholderTextColor="#7f8792"
                style={styles.input}
              />

              <Text style={styles.label}>Branch</Text>
              <TextInput
                value={settings.branch}
                onChangeText={(branch) =>
                  setSettings((current) => ({ ...current, branch }))
                }
                autoCapitalize="none"
                placeholder="main"
                placeholderTextColor="#7f8792"
                style={styles.input}
              />

              <Text style={styles.label}>Queue path</Text>
              <TextInput
                value={settings.queuePath}
                onChangeText={(queuePath) =>
                  setSettings((current) => ({ ...current, queuePath }))
                }
                autoCapitalize="none"
                placeholder="queue/pending-webtoons.jsonl"
                placeholderTextColor="#7f8792"
                style={styles.input}
              />

              <Text style={styles.label}>
                GitHub token {hasToken ? "(저장됨)" : "(필수)"}
              </Text>
              <TextInput
                value={tokenInput}
                onChangeText={setTokenInput}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={hasToken ? "새 토큰으로 교체하려면 입력" : "fine-grained PAT"}
                placeholderTextColor="#7f8792"
                secureTextEntry
                style={styles.input}
              />

              <View style={styles.buttonRow}>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.actionButton, styles.primaryActionButton]}
                  onPress={saveSettings}
                >
                  <Text style={styles.actionButtonText}>설정 저장</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={styles.actionButton}
                  disabled={isTestingConnection}
                  onPress={checkConnection}
                >
                  <Text style={styles.actionButtonText}>
                    {isTestingConnection ? "확인 중" : "연결 테스트"}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={!hasToken}
                style={[
                  styles.deleteButton,
                  !hasToken && styles.submitButtonDisabled
                ]}
                onPress={deleteToken}
              >
                <Text style={styles.deleteButtonText}>저장된 토큰 삭제</Text>
              </Pressable>

              <Text style={styles.helperText}>{settingsMessage}</Text>
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
                저장소 설정은 SecureStore에 저장하고, GitHub Contents API로 queue
                파일을 읽고 갱신합니다.
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
  inputError: {
    borderColor: "#ff6b7a"
  },
  textarea: {
    minHeight: 112,
    paddingTop: 12,
    lineHeight: 22
  },
  ratingInput: {
    marginBottom: 8
  },
  ratingHelper: {
    marginBottom: 10,
    color: "#9aa3b2",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
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
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  actionButton: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#566071",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#242b3a"
  },
  primaryActionButton: {
    borderColor: "#ff4050",
    backgroundColor: "#e93449"
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  },
  deleteButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#7f8792",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#202635"
  },
  deleteButtonText: {
    color: "#d5dbe6",
    fontSize: 14,
    fontWeight: "900"
  },
  helperText: {
    marginTop: 10,
    color: "#aeb7c6",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19
  },
  submitMessage: {
    marginTop: 10,
    color: "#ffcf5a",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 19
  },
  recentBox: {
    gap: 10,
    borderColor: "#303747",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 12,
    backgroundColor: "#151925"
  },
  recentItem: {
    gap: 3,
    borderTopColor: "#303747",
    borderTopWidth: 1,
    paddingTop: 10
  },
  recentTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  },
  recentMeta: {
    color: "#aeb7c6",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
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
