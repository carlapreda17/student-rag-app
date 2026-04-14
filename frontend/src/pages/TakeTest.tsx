import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "../components/ScreenWrapper";
import { COLORS } from "../../constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL;


// ── Tipuri care se potrivesc EXACT cu ce returnează backend-ul tău ──
type BackendQuestion = {
  id: number | string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: "A" | "B" | "C" | "D";
  explanation: string;
};

type ScreenState = "quiz" | "results" | "review";

export default function TakeTest({ route, navigation }: any) {
  const questions: BackendQuestion[] = route.params?.questions || [];
  const difficulty: string = route.params?.difficulty || "medium";
  const docID: string = route.params?.docID || "";
  const testID: string = route.params?.testID || "";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [screen, setScreen] = useState<ScreenState>("quiz");
  const [reviewFilter, setReviewFilter] = useState<"all" | "correct" | "wrong">("all");

  // ── Dacă nu avem întrebări ──
  if (!questions || questions.length === 0) {
    return (
      <ScreenWrapper headerColor={COLORS.mainblue}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: "#83829A" }}>Nu am primit nicio întrebare.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
            <Text style={{ color: COLORS.mainblue, fontWeight: "bold" }}>Întoarce-te</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // ── Calcule comune ──
  const currentQuestion = questions[currentIndex];
  const currentSelection = selectedAnswers[currentQuestion.id];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  questions.forEach((q) => {
    const ans = selectedAnswers[q.id];
    if (!ans) unansweredCount++;
    else if (ans === q.correct) correctCount++;
    else wrongCount++;
  });

  const scorePercentage = Math.round((correctCount / questions.length) * 100);

  const saveResultsToDB = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await fetch(`${API_URL}/save-test-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          test_id: testID,
          doc_id: docID,
          difficulty: difficulty,
          num_questions: questions.length,
          score: scorePercentage,
          questions: questions.map((q, idx) => ({
            question_index: idx,
            question_text: q.question,
            correct_answer: q.correct,
            user_answer: selectedAnswers[q.id] ?? null,
            is_correct: selectedAnswers[q.id] != null
              ? selectedAnswers[q.id] === q.correct
              : null,
            explanation: q.explanation,
          })),
        }),
      });
      console.log("Salvat în BD cu succes!");
    } catch (error) {
      console.error("Eroare la salvarea în baza de date:", error);
    }
  };


  // ── Handlers ──
  const handleSelectOption = (letter: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [currentQuestion.id]: letter }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      saveResultsToDB();
      setScreen("results");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  // Filtrare pentru review
  const getFilteredQuestions = () => {
    if (reviewFilter === "all") return questions;
    if (reviewFilter === "correct") return questions.filter((q) => selectedAnswers[q.id] === q.correct);
    return questions.filter((q) => selectedAnswers[q.id] !== q.correct);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ██  ECRAN: REVIEW — Rezumatul detaliat al testului
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === "review") {
    const filteredQuestions = getFilteredQuestions();

    return (
      <ScreenWrapper headerColor={COLORS.mainblue}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setScreen("results")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <Text style={styles.headerTitle}>Rezumat Test</Text>
            <Text style={styles.headerSub}>
              {correctCount}/{questions.length} răspunsuri corecte · {scorePercentage}%
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Filtre */}
        <View style={styles.filterBar}>
          {[
            { key: "all" as const, label: "Toate", count: questions.length, icon: "list" },
            { key: "correct" as const, label: "Corecte", count: correctCount, icon: "checkmark-circle" },
            { key: "wrong" as const, label: "Greșite", count: wrongCount + unansweredCount, icon: "close-circle" },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, reviewFilter === f.key && styles.filterChipActive]}
              onPress={() => setReviewFilter(f.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={f.icon as any}
                size={16}
                color={reviewFilter === f.key ? "#fff" : "#83829A"}
              />
              <Text style={[styles.filterChipText, reviewFilter === f.key && styles.filterChipTextActive]}>
                {f.label} ({f.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista întrebărilor */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredQuestions.length === 0 ? (
            <View style={styles.emptyReview}>
              <Text style={{ fontSize: 40 }}>
                {reviewFilter === "correct" ? "🏆" : "📚"}
              </Text>
              <Text style={styles.emptyReviewText}>
                {reviewFilter === "correct"
                  ? "Nu ai răspunsuri corecte la acest test."
                  : "Felicitări! Nu ai nicio greșeală!"}
              </Text>
            </View>
          ) : (
            filteredQuestions.map((q, idx) => {
              const userAnswer = selectedAnswers[q.id];
              const isCorrect = userAnswer === q.correct;
              const wasUnanswered = !userAnswer;

              return (
                <View key={q.id} style={styles.reviewCard}>
                  {/* Indicatorul de status + nr. întrebare */}
                  <View style={styles.reviewCardHeader}>
                    <View
                      style={[
                        styles.reviewStatusBadge,
                        isCorrect
                          ? styles.reviewStatusCorrect
                          : styles.reviewStatusWrong,
                      ]}
                    >
                      <Ionicons
                        name={isCorrect ? "checkmark" : "close"}
                        size={14}
                        color="#fff"
                      />
                    </View>
                    <Text style={styles.reviewQuestionNumber}>
                      Întrebarea {questions.indexOf(q) + 1}
                    </Text>
                    <View
                      style={[
                        styles.reviewStatusLabel,
                        isCorrect
                          ? { backgroundColor: "#e8f5e9" }
                          : { backgroundColor: "#fef2f2" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reviewStatusLabelText,
                          isCorrect
                            ? { color: COLORS.green }
                            : { color: COLORS.brightRed },
                        ]}
                      >
                        {isCorrect ? "Corect" : wasUnanswered ? "Fără răspuns" : "Greșit"}
                      </Text>
                    </View>
                  </View>

                  {/* Textul întrebării */}
                  <Text style={styles.reviewQuestionText}>{q.question}</Text>

                  {/* Variantele */}
                  <View style={{ gap: 8, marginTop: 16 }}>
                    {Object.entries(q.options).map(([letter, text]) => {
                      const isUserChoice = userAnswer === letter;
                      const isCorrectAnswer = q.correct === letter;

                      let cardStyle = styles.reviewOptionDefault;
                      let letterBg = "#f3f4f6";
                      let letterColor = "#83829A";
                      let iconName: string | null = null;

                      if (isCorrectAnswer) {
                        cardStyle = styles.reviewOptionCorrect;
                        letterBg = COLORS.green;
                        letterColor = "#fff";
                        iconName = "checkmark-circle";
                      } else if (isUserChoice && !isCorrect) {
                        cardStyle = styles.reviewOptionWrong;
                        letterBg = COLORS.brightRed;
                        letterColor = "#fff";
                        iconName = "close-circle";
                      }

                      return (
                        <View key={letter} style={[styles.reviewOption, cardStyle]}>
                          <View style={[styles.reviewOptionLetter, { backgroundColor: letterBg }]}>
                            <Text style={[styles.reviewOptionLetterText, { color: letterColor }]}>
                              {letter}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.reviewOptionText,
                              isCorrectAnswer && { fontWeight: "700", color: "#166534" },
                              isUserChoice && !isCorrect && { color: COLORS.darkRed },
                            ]}
                          >
                            {text as string}
                          </Text>
                          {iconName && (
                            <Ionicons
                              name={iconName as any}
                              size={20}
                              color={isCorrectAnswer ? COLORS.green : COLORS.brightRed}
                              style={{ marginLeft: "auto" }}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Explicația */}
                  {q.explanation ? (
                    <View style={styles.explanationBox}>
                      <View style={styles.explanationHeader}>
                        <Ionicons name="bulb" size={18} color={COLORS.orange} />
                        <Text style={styles.explanationTitle}>Explicație</Text>
                      </View>
                      <Text style={styles.explanationText}>{q.explanation}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██  ECRAN: REZULTATE
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === "results") {
    return (
      <ScreenWrapper headerColor={COLORS.mainblue}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate("HomePage")}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rezultate Test</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.resultsContainer}>
          {/* Trofeu */}
          <View style={styles.trophyWrapper}>
            <Text style={{ fontSize: 60 }}>
              {scorePercentage >= 50 ? "🏆" : "📚"}
            </Text>
          </View>

          <Text style={styles.resultTitle}>
            {scorePercentage >= 80
              ? "Excelent!"
              : scorePercentage >= 50
              ? "Te-ai descurcat bine!"
              : "Mai ai de învățat!"}
          </Text>
          <Text style={styles.resultSub}>
            Ai răspuns corect la {correctCount} din {questions.length} întrebări.
          </Text>

          {/* Scor */}
          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>{scorePercentage}%</Text>
            <Text style={styles.scoreLabel}>Scor Total</Text>
          </View>

          {/* Statistici detaliate */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: COLORS.green }]}>
              <Text style={[styles.statNumber, { color: COLORS.green }]}>{correctCount}</Text>
              <Text style={styles.statLabel}>Corecte</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: COLORS.brightRed }]}>
              <Text style={[styles.statNumber, { color: COLORS.brightRed }]}>{wrongCount}</Text>
              <Text style={styles.statLabel}>Greșite</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: "#9ca3af" }]}>
              <Text style={[styles.statNumber, { color: "#9ca3af" }]}>{unansweredCount}</Text>
              <Text style={styles.statLabel}>Fără răspuns</Text>
            </View>
          </View>

          {/* Buton: Vezi Rezumatul */}
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => {
              setReviewFilter("all");
              setScreen("review");
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text" size={20} color={COLORS.mainblue} />
            <Text style={styles.reviewBtnText}>Vezi Rezumatul Complet</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.mainblue} />
          </TouchableOpacity>

          {/* Buton: Vezi doar greșelile */}
          {wrongCount + unansweredCount > 0 && (
            <TouchableOpacity
              style={[styles.reviewBtn, { borderColor: COLORS.brightRed }]}
              onPress={() => {
                setReviewFilter("wrong");
                setScreen("review");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle" size={20} color={COLORS.brightRed} />
              <Text style={[styles.reviewBtnText, { color: COLORS.brightRed }]}>
                Vezi doar greșelile ({wrongCount + unansweredCount})
              </Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.brightRed} />
            </TouchableOpacity>
          )}

        </ScrollView>
      </ScreenWrapper>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██  ECRAN: QUIZ (Întrebări) — identic cu ce aveai
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <ScreenWrapper headerColor={COLORS.mainblue}>
      {/* Header & Progress */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Întrebarea {currentIndex + 1} din {questions.length}
          </Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cardul Întrebării */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* Variante de Răspuns */}
        <View style={styles.optionsWrapper}>
          {Object.entries(currentQuestion.options).map(([letter, text]) => {
            const isSelected = currentSelection === letter;
            return (
              <TouchableOpacity
                key={letter}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleSelectOption(letter)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionLetterBox, isSelected && styles.optionLetterBoxSelected]}>
                  <Text style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                    {letter}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {text as string}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && { opacity: 0 }]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Ionicons name="arrow-back" size={24} color="#83829A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextBtn, currentSelection === undefined && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={currentSelection === undefined}
          activeOpacity={0.8}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex === questions.length - 1 ? "Finalizează" : "Următoarea"}
          </Text>
          <Ionicons
            name={currentIndex === questions.length - 1 ? "checkmark-circle" : "arrow-forward"}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

// ── Stiluri ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Header ──
  header: {
    backgroundColor: COLORS.mainblue,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
  },
  progressContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  progressText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  progressBarBg: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.orange,
    borderRadius: 3,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 2,
  },

  // ── Content ──
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // ── Quiz: Question Card ──
  questionCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ece9ff",
    shadowColor: "#6366f1",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
    lineHeight: 26,
  },

  // ── Quiz: Options ──
  optionsWrapper: { gap: 12 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#ece9ff",
  },
  optionCardSelected: {
    borderColor: COLORS.orange,
    backgroundColor: "#fff7ed",
  },
  optionLetterBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f8f7ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionLetterBoxSelected: { backgroundColor: COLORS.orange },
  optionLetter: { fontSize: 14, fontWeight: "700", color: "#83829A" },
  optionLetterSelected: { color: "#fff" },
  optionText: { flex: 1, fontSize: 15, color: "#393E46", lineHeight: 22 },
  optionTextSelected: { fontWeight: "600", color: "#1a1a2e" },

  // ── Quiz: Footer ──
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ece9ff",
  },
  navBtn: {
    padding: 12,
    backgroundColor: "#f8f7ff",
    borderRadius: 16,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.mainblue,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: COLORS.mainblue,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nextBtnDisabled: {
    backgroundColor: "#c7d2fe",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // ── Results ──
  resultsContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  trophyWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 4,
    borderColor: COLORS.orange,
  },
  resultTitle: { fontSize: 26, fontWeight: "800", color: COLORS.darkGrey, marginBottom: 8 },
  resultSub: { fontSize: 15, color: "#83829A", textAlign: "center", marginBottom: 32 },
  scoreBox: {
    backgroundColor: "#fff",
    paddingVertical: 24,
    paddingHorizontal: 48,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ece9ff",
    shadowColor: COLORS.mainblue,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  scoreText: { fontSize: 48, fontWeight: "900", color: COLORS.orange },
  scoreLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#83829A",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // ── Results: Stats Row ──
  statsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ece9ff",
    borderLeftWidth: 4,
  },
  statNumber: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 11, color: "#83829A", fontWeight: "600", marginTop: 4 },

  // ── Results: Review Button ──
  reviewBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.mainblue,
    marginBottom: 12,
  },
  reviewBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.mainblue,
  },

  // ── Primary Button ──
  primaryBtn: {
    width: "100%",
    backgroundColor: COLORS.mainblue,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: COLORS.mainblue,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // ── Review: Filter Bar ──
  filterBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ece9ff",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  filterChipActive: {
    backgroundColor: COLORS.mainblue,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#83829A",
  },
  filterChipTextActive: {
    color: "#fff",
  },

  // ── Review: Empty State ──
  emptyReview: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyReviewText: {
    fontSize: 15,
    color: "#83829A",
    marginTop: 12,
    fontWeight: "500",
    textAlign: "center",
  },

  // ── Review: Card ──
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ece9ff",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  reviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  reviewStatusBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewStatusCorrect: {
    backgroundColor: COLORS.green,
  },
  reviewStatusWrong: {
    backgroundColor: COLORS.brightRed,
  },
  reviewQuestionNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a2e",
    flex: 1,
  },
  reviewStatusLabel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewStatusLabelText: {
    fontSize: 12,
    fontWeight: "700",
  },
  reviewQuestionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
    lineHeight: 24,
  },

  // ── Review: Options ──
  reviewOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewOptionDefault: {
    backgroundColor: "#fafafa",
    borderColor: "#f3f4f6",
  },
  reviewOptionCorrect: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  reviewOptionWrong: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  reviewOptionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reviewOptionLetterText: {
    fontSize: 13,
    fontWeight: "700",
  },
  reviewOptionText: {
    flex: 1,
    fontSize: 14,
    color: "#393E46",
    lineHeight: 20,
  },

  // ── Review: Explanation ──
  explanationBox: {
    marginTop: 16,
    backgroundColor: "#fffbeb",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.orange,
  },
  explanationText: {
    fontSize: 13,
    color: "#92400e",
    lineHeight: 20,
  },
});
