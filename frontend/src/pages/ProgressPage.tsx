import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenWrapper from "../components/ScreenWrapper";
import { COLORS } from "../../constants/theme";
import BackButton from "../components/BackButton";

const { width } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ───────────────────────────────────────────────────────────────────

type TestResult = {
    test_id: string;
    doc_id: string;
    nume_fisier: string;
    difficulty: "easy" | "medium" | "hard";
    num_questions: number;
    score: number; // procent 0-100
    completed_at: string;
    questions?: QuestionResult[];
};

type QuestionResult = {
    question_index: number;
    question_text: string;
    correct_answer: string;
    user_answer: string;
    is_correct: boolean;
    explanation: string;
};

type ProgressStats = {
    total_tests: number;
    avg_score: number;
    best_score: number;
    tests_passed: number; // scor >= 50
    tests_failed: number; // scor < 50
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
    easy: { label: "Ușor", color: "#10b981", bg: "#d1fae5" },
    medium: { label: "Mediu", color: "#f59e0b", bg: "#fef3c7" },
    hard: { label: "Dificil", color: "#ef4444", bg: "#fee2e2" },
};

function getScoreColor(score: number) {
    if (score >= 80) return "#10b981";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function truncate(str: string, max = 28) {
    try {
        const decoded = decodeURIComponent(str);
        return decoded.length > max ? decoded.slice(0, max) + "…" : decoded;
    } catch {
        return str.length > max ? str.slice(0, max) + "…" : str;
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProgressPage({ navigation }: any) {
    const [tests, setTests] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [retaking, setRetaking] = useState<string | null>(null); // test_id în curs de refacere
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"all" | "failed" | "passed">("all");

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchTests = useCallback(async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(`${API_URL}/my-tests`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Eroare server");
            const data = await res.json();
            setTests(data.tests ?? []);
        } catch (e) {
            console.error("Eroare fetch tests:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    // ── Stats ──────────────────────────────────────────────────────────────────

    const stats: ProgressStats = {
        total_tests: tests.length,
        avg_score:
            tests.length > 0
                ? Math.round(tests.reduce((s, t) => s + t.score, 0) / tests.length)
                : 0,
        best_score: tests.length > 0 ? Math.max(...tests.map((t) => t.score)) : 0,
        tests_passed: tests.filter((t) => t.score >= 50).length,
        tests_failed: tests.filter((t) => t.score < 50).length,
    };

    // ── Weak spots: întrebări greșite frecvent ─────────────────────────────────

    const wrongQuestions = tests
        .flatMap((t) => (t.questions ?? []).filter((q) => !q.is_correct))
        .slice(0, 5);

    // ── Retake test ────────────────────────────────────────────────────────────

    const handleRetake = async (test: TestResult) => {
        try {
            setRetaking(test.test_id);
            const token = await AsyncStorage.getItem("token");

            // Fetch întrebările originale dacă nu le avem deja
            let questions = test.questions;
            if (!questions) {
                const res = await fetch(`${API_URL}/test-questions/${test.test_id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error();
                const data = await res.json();
                questions = data.questions;
            }

            // Navighează la pagina de test cu datele existente (fără re-generare)
            navigation.navigate("Test", {
                retakeMode: true,
                test_id: test.test_id,
                doc_id: test.doc_id,
                difficulty: test.difficulty,
                num_questions: test.num_questions,
                questions,
                nume_fisier: test.nume_fisier,
            });
        } catch {
            Alert.alert("Eroare", "Nu s-au putut încărca întrebările testului.");
        } finally {
            setRetaking(null);
        }
    };

    // ── Filtered list ──────────────────────────────────────────────────────────

    const filteredTests = tests.filter((t) => {
        if (activeTab === "failed") return t.score < 50;
        if (activeTab === "passed") return t.score >= 50;
        return true;
    });

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <ScreenWrapper headerColor={COLORS.mainblue}>
                    {/* ── Header ── */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>Progresul meu</Text>
                            <Text style={styles.headerSub}>
                               Statistici & istoric teste
                            </Text>
                        </View>
                        <BackButton color="#f8fafc" onPress={() => navigation.goBack()} />
                    </View>

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={COLORS.mainblue} />
                        <Text style={styles.loadingText}>Se încarcă statisticile...</Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* ── Overview Cards ── */}
                        <View style={styles.section}>
                            <View style={styles.statsGrid}>
                                <StatCard
                                    icon="clipboard-outline"
                                    label="Teste date"
                                    value={stats.total_tests}
                                    color="#6366f1"
                                    bg="#ede9fe"
                                />
                                <StatCard
                                    icon="trophy-outline"
                                    label="Scor mediu"
                                    value={`${stats.avg_score}%`}
                                    color={getScoreColor(stats.avg_score)}
                                    bg={stats.avg_score >= 50 ? "#d1fae5" : "#fee2e2"}
                                />
                                <StatCard
                                    icon="star-outline"
                                    label="Cel mai bun"
                                    value={`${stats.best_score}%`}
                                    color="#f59e0b"
                                    bg="#fef3c7"
                                />
                                <StatCard
                                    icon="checkmark-circle-outline"
                                    label="Promovate"
                                    value={stats.tests_passed}
                                    color="#10b981"
                                    bg="#d1fae5"
                                />
                            </View>
                        </View>

                        {/* ── Score Progress Bar ── */}
                        {tests.length > 0 && (
                            <View style={[styles.section, styles.card]}>
                                <Text style={styles.cardTitle}>Distribuție rezultate</Text>
                                <View style={styles.progressBarContainer}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${(stats.tests_passed / stats.total_tests) * 100}%`,
                                                backgroundColor: "#10b981",
                                            },
                                        ]}
                                    />
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${(stats.tests_failed / stats.total_tests) * 100}%`,
                                                backgroundColor: "#ef4444",
                                            },
                                        ]}
                                    />
                                </View>
                                <View style={styles.legendRow}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
                                        <Text style={styles.legendText}>
                                            Promovate ({stats.tests_passed})
                                        </Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
                                        <Text style={styles.legendText}>
                                            Nepromovate ({stats.tests_failed})
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* ── Weak Spots ── */}
                        {wrongQuestions.length > 0 && (
                            <View style={[styles.section, styles.card]}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="warning-outline" size={18} color="#ef4444" />
                                    <Text style={[styles.cardTitle, { marginLeft: 6, marginBottom: 0 }]}>
                                        Noțiuni greșite frecvent
                                    </Text>
                                </View>
                                <Text style={styles.cardSubtitle}>
                                    Ultimele {wrongQuestions.length} întrebări la care ai greșit
                                </Text>
                                {wrongQuestions.map((q, i) => (
                                    <View key={i} style={styles.weakItem}>
                                        <View style={styles.weakIndex}>
                                            <Text style={styles.weakIndexText}>{i + 1}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.weakQuestion} numberOfLines={2}>
                                                {q.question_text}
                                            </Text>
                                            <Text style={styles.weakExplanation} numberOfLines={2}>
                                                {q.explanation}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* ── Test History ── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Istoric teste</Text>

                            {/* Tabs */}
                            <View style={styles.tabRow}>
                                {(["all", "passed", "failed"] as const).map((tab) => (
                                    <TouchableOpacity
                                        key={tab}
                                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                                        onPress={() => setActiveTab(tab)}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.tabText,
                                                activeTab === tab && styles.tabTextActive,
                                            ]}
                                        >
                                            {tab === "all"
                                                ? "Toate"
                                                : tab === "passed"
                                                ? "Promovate"
                                                : "Nepromovate"}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {filteredTests.length === 0 ? (
                                <View style={styles.emptyTests}>
                                    <Ionicons
                                        name="document-outline"
                                        size={40}
                                        color="#d1d5db"
                                    />
                                    <Text style={styles.emptyText}>Niciun test în această categorie</Text>
                                </View>
                            ) : (
                                <View style={{ gap: 10 }}>
                                    {filteredTests.map((test) => (
                                        <TestCard
                                            key={test.test_id}
                                            test={test}
                                            expanded={expandedId === test.test_id}
                                            onToggle={() =>
                                                setExpandedId(
                                                    expandedId === test.test_id ? null : test.test_id
                                                )
                                            }
                                            onRetake={() => handleRetake(test)}
                                            retaking={retaking === test.test_id}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    </ScrollView>
                )}
          
        </ScreenWrapper>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    icon,
    label,
    value,
    color,
    bg,
}: {
    icon: any;
    label: string;
    value: string | number;
    color: string;
    bg: string;
}) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// ─── Test Card ────────────────────────────────────────────────────────────────

function TestCard({
    test,
    expanded,
    onToggle,
    onRetake,
    retaking,
}: {
    test: TestResult;
    expanded: boolean;
    onToggle: () => void;
    onRetake: () => void;
    retaking: boolean;
}) {
    const failed = test.score < 50;
    const diff = DIFFICULTY_CONFIG[test.difficulty];
    const scoreColor = getScoreColor(test.score);

    return (
        <View style={[styles.testCard, failed && styles.testCardFailed]}>
            {/* Main row */}
            <TouchableOpacity
                style={styles.testCardMain}
                onPress={onToggle}
                activeOpacity={0.8}
            >
                {/* Score circle */}
                <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                    <Text style={[styles.scoreValue, { color: scoreColor }]}>
                        {test.score}
                    </Text>
                    <Text style={[styles.scorePercent, { color: scoreColor }]}>%</Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.testFileName} numberOfLines={1}>
                        {truncate(test.nume_fisier, 30)}
                    </Text>
                    <View style={styles.testMeta}>
                        <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
                            <Text style={[styles.diffText, { color: diff.color }]}>
                                {diff.label}
                            </Text>
                        </View>
                        <Text style={styles.testMetaText}>
                            {test.num_questions} întrebări · {formatDate(test.completed_at)}
                        </Text>
                    </View>
                    {failed && (
                        <View style={styles.failBadge}>
                            <Ionicons name="close-circle-outline" size={12} color="#ef4444" />
                            <Text style={styles.failText}>Sub limita de promovare</Text>
                        </View>
                    )}
                </View>

                <Ionicons
                    name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
                    size={18}
                    color="#9ca3af"
                />
            </TouchableOpacity>

            {/* Expanded details */}
            {expanded && (
                <View style={styles.expandedSection}>
                    {/* Mini progress bar */}
                    <View style={styles.miniBarBg}>
                        <View
                            style={[
                                styles.miniBarFill,
                                { width: `${test.score}%`, backgroundColor: scoreColor },
                            ]}
                        />
                    </View>

                    {/* Wrong questions preview */}
                    {test.questions && test.questions.filter((q) => !q.is_correct).length > 0 && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={styles.expandedLabel}>
                                Întrebări greșite (
                                {test.questions.filter((q) => !q.is_correct).length})
                            </Text>
                            {test.questions
                                .filter((q) => !q.is_correct)
                                .slice(0, 3)
                                .map((q, i) => (
                                    <View key={i} style={styles.wrongItem}>
                                        <Ionicons
                                            name="close-circle"
                                            size={14}
                                            color="#ef4444"
                                            style={{ marginTop: 2 }}
                                        />
                                        <Text style={styles.wrongText} numberOfLines={2}>
                                            {q.question_text}
                                        </Text>
                                    </View>
                                ))}
                        </View>
                    )}

                    {/* Retake button for failed tests */}
                    {failed && (
                        <TouchableOpacity
                            style={[styles.retakeBtn, retaking && { opacity: 0.6 }]}
                            onPress={onRetake}
                            disabled={retaking}
                            activeOpacity={0.85}
                        >
                            {retaking ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="refresh-circle-outline" size={18} color="#fff" />
                                    <Text style={styles.retakeBtnText}>Refă testul</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    // Header
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: COLORS.mainblue,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 20,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.12)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#f8fafc",
        letterSpacing: -0.3,
    },
    headerSub: {
        fontSize: 12,
        color: "rgba(255,255,255,0.5)",
        marginTop: 1,
    },
    refreshBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: "#ede9fe",
        alignItems: "center",
        justifyContent: "center",
    },

    // Loading
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    loadingText: { fontSize: 14, color: "#9ca3af" },

    // Sections
    section: { paddingHorizontal: 20, paddingTop: 20 },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a2e",
        marginBottom: 12,
    },

    // Card wrapper
    card: {
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 16,
        marginHorizontal: 20,
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#ece9ff",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1a1a2e",
        marginBottom: 10,
    },
    cardSubtitle: {
        fontSize: 12,
        color: "#9ca3af",
        marginBottom: 12,
    },

    // Stats grid
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    statCard: {
        flex: 1,
        minWidth: (width - 60) / 2,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 14,
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: "#ece9ff",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    statIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 11,
        color: "#9ca3af",
        fontWeight: "500",
        textAlign: "center",
    },

    // Progress bar
    progressBarContainer: {
        height: 10,
        borderRadius: 6,
        backgroundColor: "#f1f5f9",
        flexDirection: "row",
        overflow: "hidden",
        marginBottom: 10,
    },
    progressBarFill: {
        height: "100%",
    },
    legendRow: {
        flexDirection: "row",
        gap: 16,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        color: "#6b7280",
    },

    // Weak spots
    weakItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    weakIndex: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#fee2e2",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1,
    },
    weakIndexText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#ef4444",
    },
    weakQuestion: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1a1a2e",
        lineHeight: 18,
        marginBottom: 2,
    },
    weakExplanation: {
        fontSize: 11,
        color: "#9ca3af",
        lineHeight: 16,
    },

    // Tabs
    tabRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
    },
    tabActive: {
        backgroundColor: COLORS.mainblue,
    },
    tabText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6b7280",
    },
    tabTextActive: {
        color: "#fff",
    },

    // Empty state
    emptyTests: {
        alignItems: "center",
        paddingVertical: 30,
        gap: 10,
    },
    emptyText: {
        fontSize: 14,
        color: "#9ca3af",
    },

    // Test Card
    testCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#ece9ff",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    testCardFailed: {
        borderColor: "#fecaca",
        borderLeftWidth: 4,
        borderLeftColor: "#ef4444",
    },
    testCardMain: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        gap: 4,
    },
    scoreCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2.5,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    scoreValue: {
        fontSize: 15,
        fontWeight: "800",
        letterSpacing: -0.5,
    },
    scorePercent: {
        fontSize: 10,
        fontWeight: "700",
        marginTop: 3,
    },
    testFileName: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1a1a2e",
        marginBottom: 5,
    },
    testMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },
    diffBadge: {
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    diffText: {
        fontSize: 11,
        fontWeight: "700",
    },
    testMetaText: {
        fontSize: 11,
        color: "#9ca3af",
    },
    failBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
    },
    failText: {
        fontSize: 11,
        color: "#ef4444",
        fontWeight: "500",
    },

    // Expanded section
    expandedSection: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        paddingTop: 12,
    },
    miniBarBg: {
        height: 6,
        borderRadius: 4,
        backgroundColor: "#f1f5f9",
        overflow: "hidden",
    },
    miniBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    expandedLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#6b7280",
        marginBottom: 8,
        letterSpacing: 0.3,
        textTransform: "uppercase",
    },
    wrongItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
        marginBottom: 6,
    },
    wrongText: {
        flex: 1,
        fontSize: 12,
        color: "#374151",
        lineHeight: 17,
    },

    // Retake button
    retakeBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#ef4444",
        borderRadius: 12,
        paddingVertical: 11,
        marginTop: 14,
        shadowColor: "#ef4444",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    retakeBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#fff",
    },
});
