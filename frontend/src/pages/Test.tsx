import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../components/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenWrapper from "../components/ScreenWrapper";
import { COLORS } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";

// ── Tipuri ───────────────────────────────────────────────────────────────────

type FileType = "PDF" | "DOCX" | "TXT" | "PPT" | "PPTX";
type DifficultyKey = "easy" | "medium" | "hard";
type StepType = 1 | 2 | 3;

interface Document {
  doc_id: string;
  nume_fisier: string;
  folder: string;
  tip_fisier: FileType;
}

const decodeName = (name: string) => { try { return decodeURIComponent(name); } catch { return name; } };

interface Difficulty {
  key: DifficultyKey;
  label: string;
  description: string;
  color: string;
  bg: string;
  icon: string;
}

// Folosim culorile din temă pentru dificultăți
const DIFFICULTIES: Difficulty[] = [
  { key: "easy",   label: "Ușor",    description: "Concepte de bază", color: COLORS.green, bg: "#e8f5e9", icon: "🌱" },
  { key: "medium", label: "Mediu",   description: "Aplicații și raționament", color: COLORS.orange, bg: "#fff7ed", icon: "⚡" },
  { key: "hard",   label: "Dificil", description: "Analiză avansată", color: COLORS.brightRed, bg: "#fef2f2", icon: "🔥" },
];

const QUESTION_COUNTS: number[] = [10, 15, 20];
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ── Componente helper ─────────────────────────────────────────────────────────

interface StepIndicatorProps {
  number: number;
  label: string;
  active: boolean;
  done: boolean;
}

const StepIndicator = ({ number, label, active, done }: StepIndicatorProps) => (
  <View style={styles.stepWrapper}>
    <View style={[
        styles.stepCircle, 
        done && styles.stepCircleDone,
        active && styles.stepCircleActive
    ]}>
      <Text style={[
          styles.stepNumber, 
          (active || done) && styles.stepNumberActive
      ]}>
        {done ? "✓" : number}
      </Text>
    </View>
    <Text style={[
        styles.stepLabel, 
        active && styles.stepLabelActive,
        done && styles.stepLabelDone
    ]}>
      {label}
    </Text>
  </View>
);

const FileIcon = ({ type }: { type: FileType }) => (
  <View style={[styles.fileIcon, { backgroundColor: type === "PDF" ? "#fee2e2" : "#dbeafe" }]}>
    <Ionicons 
        name={type === "PDF" ? "document-text" : "document"} 
        size={20} 
        color={type === "PDF" ? COLORS.orange : COLORS.mainblue} 
    />
  </View>
);

export default function Test({ route, navigation }: any) {
  const { user, logout } = useAuth();
  const [step, setStep] = useState<StepType>(1);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [documente, setDocumente] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<DifficultyKey>("medium");
  const [generating, setGenerating] = useState<boolean>(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [maxQuestions, setMaxQuestions] = useState<number>(20);
  const [recommendedOptions, setRecommendedOptions] = useState<number[]>([10, 15, 20]);
  const [estimating, setEstimating] = useState<boolean>(false);
  const [docInfo, setDocInfo] = useState<{words: number, chunks: number} | null>(null);

  const filtered = documente.filter(
    (d) =>
      decodeName(d.nume_fisier).toLowerCase().includes(search.toLowerCase()) ||
      d.folder.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Document[]>>((acc, doc) => {
    if (!acc[doc.folder]) acc[doc.folder] = [];
    acc[doc.folder].push(doc);
    return acc;
  }, {});

  const selectedDiff = DIFFICULTIES.find((d) => d.key === difficulty)!;

  const handleGenerate = async (): Promise<void> => {
    setGenerating(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(`${API_URL}/generate-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doc_id: selectedDoc?.doc_id,
          num_questions: numQuestions,
          difficulty: difficulty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Eroare la generarea testului");
      }

      const data = await response.json();
      setGeneratedQuestions(data.questions); // Salvăm întrebările primite
      setGeneratedData(data); // Salvăm toate datele generate
      console.log("Test generat cu succes:", data);
    } catch (error) {
      console.error("Eroare:", error);
      alert("Nu am putut genera testul. Te rugăm să încerci din nou.");
      setStep(2); // Ne întoarcem la pasul anterior în caz de eroare
    } finally {
      setGenerating(false);
    }
  };

   useEffect(() => {
        fetchDocumente();
    }, []);

    const fetchDocumente = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("token");
            const response = await fetch(`${API_URL}/documente`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setDocumente(data.documente);
        } catch (error) {
            console.error("Eroare fetch documente:", error);
        } finally {
            setLoading(false);
        }
    };
  
    const fetchEstimate = async (docId: string) => {
        setEstimating(true);
        try {
            const token = await AsyncStorage.getItem("token");
            const response = await fetch(`${API_URL}/estimate-questions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ doc_id: docId }),
            });
            const data = await response.json();

            setMaxQuestions(data.max_questions);
            setRecommendedOptions(data.recommended_options);
            setDocInfo({ words: data.estimated_words, chunks: data.num_chunks });

            // Dacă nr. curent de întrebări > max, resetează la prima opțiune
            if (numQuestions > data.max_questions) {
            setNumQuestions(data.recommended_options[0]);
            }
        } catch (err) {
            console.error("Eroare estimare:", err);
            // Fallback la valorile default
            setRecommendedOptions([10, 15, 20]);
            setMaxQuestions(20);
        } finally {
            setEstimating(false);
        }
   };

  return (
    <ScreenWrapper headerColor={COLORS.mainblue}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backBtnText}>Înapoi</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <Text style={styles.headerTitle}>Generează Test Grilă</Text>
          <Text style={styles.headerSub}>Testează-ți cunoștințele cu AI</Text>
        </View>
      </View>

      {/* ── Step bar ── */}
      <View style={styles.stepBar}>
        <StepIndicator number={1} label="Document"   active={step === 1} done={step > 1} />
        <View style={[styles.stepLine, step > 1 && styles.stepLineActive]} />
        <StepIndicator number={2} label="Configurare" active={step === 2} done={step > 2} />
        <View style={[styles.stepLine, step > 2 && styles.stepLineActive]} />
        <StepIndicator number={3} label="Generează"  active={step === 3} done={false} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ════════════════ STEP 1 — Selectare document ════════════════ */}
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Din ce document învățăm?</Text>
            <Text style={styles.sectionSub}>Alege un suport de curs din bibliotecă</Text>

            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Caută document sau folder..."
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Loading state */}
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={COLORS.orange} />
                <Text style={[styles.emptyText, { marginTop: 12 }]}>Se încarcă documentele...</Text>
              </View>
            ) : (
              <>
                {Object.entries(grouped).map(([folder, docs]) => (
                  <View key={folder} style={{ marginBottom: 20 }}>
                    <Text style={styles.folderLabel}>📁 {folder}</Text>
                    {docs.map((doc) => {
                      const isSelected = selectedDoc?.doc_id === doc.doc_id;
                      return (
                        <TouchableOpacity
                          key={doc.doc_id}
                          style={[styles.docCard, isSelected && styles.docCardSelected]}
                          onPress={() => setSelectedDoc(doc)}
                          activeOpacity={0.7}
                        >
                          <FileIcon type={doc.tip_fisier} />
                          <View style={styles.docInfo}>
                            <Text style={styles.docName} numberOfLines={2}>{decodeName(doc.nume_fisier)}</Text>
                            <Text style={styles.docMeta}>{doc.tip_fisier} · {doc.folder}</Text>
                          </View>
                          <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                {filtered.length === 0 && !loading && (
                  <View style={styles.emptyState}>
                    <Text style={{ fontSize: 40 }}>📂</Text>
                    <Text style={styles.emptyText}>Niciun document găsit</Text>
                  </View>
                )}
              </>
            )}

            <TouchableOpacity
                style={[styles.primaryBtn, !selectedDoc && styles.primaryBtnDisabled]}
                onPress={() => {
                    if (selectedDoc) {
                    fetchEstimate(selectedDoc.doc_id);
                    setStep(2);
                    }
                }}
                disabled={!selectedDoc}
                activeOpacity={0.8}
                >
                    <Text style={[styles.primaryBtnText, !selectedDoc && styles.primaryBtnTextDisabled]}>
                    Continuă cu configurarea →
                    </Text>
                </TouchableOpacity>
          </View>
        )}

        {/* ════════════════ STEP 2 — Configurare ════════════════ */}
        {step === 2 && selectedDoc && (
          <View>
            {/* Document selectat */}
            <View style={styles.docPreview}>
              <FileIcon type={selectedDoc.tip_fisier} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docPreviewName} numberOfLines={1}>{decodeName(selectedDoc.nume_fisier)}</Text>
                <Text style={styles.docPreviewMeta}>{selectedDoc.tip_fisier} · {selectedDoc.folder}</Text>
              </View>
              <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.7} style={styles.changeBtnBox}>
                <Text style={styles.changeBtn}>Schimbă</Text>
              </TouchableOpacity>
            </View>

            {/* Număr întrebări */}
            <Text style={styles.configTitle}>Număr de întrebări</Text>
           

            {estimating ? (
            <ActivityIndicator size="small" color={COLORS.orange} style={{ marginVertical: 20 }} />
            ) : (
            <View style={styles.countRow}>
                {recommendedOptions.map((n) => (
                <TouchableOpacity
                    key={n}
                    style={[styles.countCard, numQuestions === n && styles.countCardSelected]}
                    onPress={() => setNumQuestions(n)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.countNumber, numQuestions === n && styles.countNumberSelected]}>
                    {n}
                    </Text>
                    <Text style={[styles.countLabel, numQuestions === n && styles.countLabelSelected]}>
                    întrebări
                    </Text>
                </TouchableOpacity>
                ))}
            </View>
            )}

            {/* Warning dacă documentul e scurt */}
            {maxQuestions < 10 && docInfo && (
            <View style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                backgroundColor: "#fffbeb", padding: 12, borderRadius: 12,
                marginTop: 12, borderWidth: 1, borderColor: "#fef3c7"
            }}>
                <Ionicons name="information-circle" size={20} color={COLORS.orange} />
                <Text style={{ flex: 1, fontSize: 13, color: "#92400e", lineHeight: 18 }}>
                Documentul este relativ scurt. Am limitat opțiunile pentru a menține calitatea întrebărilor.
                </Text>
            </View>
            )}

            {/* Dificultate */}
            <Text style={[styles.configTitle, { marginTop: 24 }]}>Nivel de dificultate</Text>
            <Text style={styles.configSub}>Alege cât de mult vrei să te provoace AI-ul</Text>
            <View style={styles.diffRow}>
              {DIFFICULTIES.map((d) => {
                const isSelected = difficulty === d.key;
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.diffCard, isSelected && { borderColor: d.color, backgroundColor: d.bg }]}
                    onPress={() => setDifficulty(d.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.diffIcon}>{d.icon}</Text>
                    <Text style={[styles.diffLabel, isSelected && { color: d.color }]}>{d.label}</Text>
                    <Text style={styles.diffDesc}>{d.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sumar */}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>SUMAR TEST</Text>
              {(
                [
                  ["📄 Document", decodeName(selectedDoc.nume_fisier)],
                  ["❓ Întrebări", `${numQuestions} întrebări`],
                  ["🎯 Dificultate", `${selectedDiff.icon} ${selectedDiff.label}`],
                ] as [string, string][]
              ).map(([label, value]) => (
                <View key={label} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{label}</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
                </View>
              ))}
            </View>

            {/* Butoane */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)} activeOpacity={0.7}>
                <Text style={styles.secondaryBtnText}>Înapoi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 2, marginTop: 0 }]}
                onPress={() => { setStep(3); handleGenerate(); }}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Generează Testul ✨</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ════════════════ STEP 3 — Generare ════════════════ */}
        {step === 3 && (
          <View style={styles.generateCenter}>
            {generating ? (
              <>
                <View style={styles.generateIconWrapper}>
                  <Text style={{ fontSize: 36 }}>🤖</Text>
                </View>
                <Text style={styles.generateTitle}>Se generează testul...</Text>
                <Text style={styles.generateSub}>
                  Analizăm documentul și creăm {numQuestions} întrebări de nivel{" "}
                  {selectedDiff.label.toLowerCase()}
                </Text>
                <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: 32 }} />
              </>
            ) : (
              <>
                <View style={styles.successIconWrapper}>
                  <Ionicons name="checkmark" size={40} color={COLORS.green} />
                </View>
                <Text style={styles.generateTitle}>Testul este gata!</Text>
                <Text style={styles.generateSub}>
                  {numQuestions} întrebări · {selectedDiff.label} · {decodeName(selectedDoc?.nume_fisier ?? "")}
                </Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 32, paddingHorizontal: 40 }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("TakeTest", {
                     questions: generatedQuestions,
                     difficulty: difficulty,
                     docID: selectedDoc?.doc_id || "",
                     testID: generatedData?.test_id || "",

                  })}
                >
                  <Text style={styles.primaryBtnText}>Începe Testul →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// ── Stiluri ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: COLORS.mainblue,
    paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: "row", alignItems: "center",
  },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  backBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },

  // Step bar
  stepBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#ece9ff",
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  stepWrapper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center",
  },
  stepCircleActive: { backgroundColor: COLORS.orange },
  stepCircleDone: { backgroundColor: COLORS.mainblue },
  stepNumber: { fontSize: 11, fontWeight: "700", color: "#9ca3af" },
  stepNumberActive: { color: "#fff" },
  stepLabel: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
  stepLabelActive: { color: COLORS.orange, fontWeight: "700" },
  stepLabelDone: { color: COLORS.mainblue, fontWeight: "700" },
  stepLine: { flex: 1, height: 2, backgroundColor: "#f3f4f6", marginHorizontal: 8, borderRadius: 1 },
  stepLineActive: { backgroundColor: COLORS.mainblue },

  // Content
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a2e", marginBottom: 4 },
  sectionSub: { fontSize: 13, color: "#83829A", marginBottom: 20 },

  // Search
  searchWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#ece9ff", borderRadius: 16,
    paddingHorizontal: 16, marginBottom: 24,
    shadowColor: "#6366f1", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 14, color: "#1a1a2e" },

  // Folder label
  folderLabel: {
    fontSize: 11, fontWeight: "700", color: "#83829A",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12,
  },

  // Doc card
  docCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#ece9ff",
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: "#6366f1", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  docCardSelected: { borderColor: COLORS.orange, backgroundColor: "#fff7ed" },
  fileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  docInfo: { flex: 1, marginLeft: 14, marginRight: 8 },
  docName: { fontSize: 14, fontWeight: "600", color: "#1a1a2e", marginBottom: 2 },
  docMeta: { fontSize: 12, color: "#83829A" },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: "#d1d5db",
    alignItems: "center", justifyContent: "center",
  },
  radioOuterSelected: { borderColor: COLORS.orange },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.orange },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 15, color: "#83829A", marginTop: 12, fontWeight: "500" },

  // Primary button
  primaryBtn: {
    backgroundColor: COLORS.mainblue, borderRadius: 16,
    paddingVertical: 16, alignItems: "center", marginTop: 12,
    shadowColor: COLORS.mainblue, shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  primaryBtnDisabled: { backgroundColor: "#e5e7eb", shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  primaryBtnTextDisabled: { color: "#9ca3af" },

  // Secondary button
  secondaryBtn: {
    flex: 1, borderWidth: 1, borderColor: "#ece9ff",
    borderRadius: 16, paddingVertical: 16,
    alignItems: "center", backgroundColor: "#fff",
  },
  secondaryBtnText: { color: "#1a1a2e", fontSize: 15, fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 12, alignItems: "center" },

  // Step 2 — Doc preview
  docPreview: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#ece9ff",
    borderRadius: 16, padding: 14, marginBottom: 28,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  docPreviewName: { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  docPreviewMeta: { fontSize: 12, color: "#83829A", marginTop: 2 },
  changeBtnBox: { backgroundColor: "#f8f7ff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  changeBtn: { color: COLORS.mainblue, fontSize: 12, fontWeight: "700" },

  // Config titles
  configTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a2e", marginBottom: 4 },
  configSub: { fontSize: 13, color: "#83829A", marginBottom: 16 },

  // Question count
  countRow: { flexDirection: "row", gap: 10 },
  countCard: {
    flex: 1, borderWidth: 1, borderColor: "#ece9ff",
    borderRadius: 16, paddingVertical: 16,
    alignItems: "center", backgroundColor: "#fff",
  },
  countCardSelected: { borderColor: COLORS.orange, backgroundColor: "#fff7ed" },
  countNumber: { fontSize: 24, fontWeight: "800", color: "#393E46" },
  countNumberSelected: { color: COLORS.orange },
  countLabel: { fontSize: 11, color: "#83829A", marginTop: 2, fontWeight: "500" },
  countLabelSelected: { color: COLORS.orange },

  // Difficulty
  diffRow: { flexDirection: "row", gap: 10 },
  diffCard: {
    flex: 1, borderWidth: 1, borderColor: "#ece9ff",
    borderRadius: 16, padding: 14, backgroundColor: "#fff",
  },
  diffIcon: { fontSize: 24, marginBottom: 8 },
  diffLabel: { fontSize: 14, fontWeight: "700", color: "#393E46" },
  diffDesc: { fontSize: 11, color: "#83829A", marginTop: 4, lineHeight: 14 },

  // Summary
  summary: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#ece9ff",
    borderRadius: 16, padding: 18, marginTop: 28, marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 11, fontWeight: "700", color: "#83829A", letterSpacing: 1, marginBottom: 14,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: "#83829A", fontWeight: "500" },
  summaryValue: { fontSize: 14, fontWeight: "700", color: "#1a1a2e", maxWidth: "60%", textAlign: "right" },

  // Step 3 — Generate
  generateCenter: { alignItems: "center", paddingVertical: 60 },
  generateIconWrapper: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#fff7ed", borderWidth: 2, borderColor: COLORS.orange,
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  successIconWrapper: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#e8f5e9", borderWidth: 2, borderColor: COLORS.green,
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  generateTitle: { fontSize: 22, fontWeight: "800", color: "#1a1a2e", marginBottom: 10 },
  generateSub: { fontSize: 14, color: "#83829A", textAlign: "center", paddingHorizontal: 20, lineHeight: 22 },
});