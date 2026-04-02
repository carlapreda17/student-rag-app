import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../../constants/theme";
import ScreenWrapper from "../components/ScreenWrapper";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get("window");

// ─── Types ───────────────────────────────────────────────────
type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  surse?: { nume_fisier: string; chunk_index: number; text_preview: string }[];
  tokens?: number;
  timestamp: Date;
};

type DocInfo = {
  doc_id: string;
  nume_fisier: string;
  folder: string;
  tip_fisier: string;
};

// ─── Component ───────────────────────────────────────────────
export default function Chat({ route, navigation }: any) {
  const initialDocId = route?.params?.docId ?? null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [documente, setDocumente] = useState<DocInfo[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>(
    initialDocId ? [initialDocId] : []
  );
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [sugestii, setSugestii] = useState<string[]>([]);
  const [loadingSugestii, setLoadingSugestii] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Keyboard listeners — also close doc picker ──
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
        setShowDocPicker(false); // Închide picker-ul când apare tastatura
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Fetch documente ──
  useEffect(() => {
    fetchDocumente();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    fetchSugestii();
  }, [selectedDocs]);

  const fetchSugestii = async () => {
    setLoadingSugestii(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/sugestii-intrebari`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doc_ids: selectedDocs.length > 0 ? selectedDocs : null,
          numar_sugestii: 3,
        }),
      });
      const data = await res.json();
      if (data.sugestii?.length > 0) {
        setSugestii(data.sugestii);
      }
    } catch (err) {
      console.error("Eroare fetch sugestii:", err);
    } finally {
      setLoadingSugestii(false);
    }
  };

  const fetchDocumente = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/documente`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDocumente(data.documente ?? []);
    } catch (err) {
      console.error("Eroare fetch documente:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // ── Trimite mesaj ──
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const token = await AsyncStorage.getItem("token");
      const body: any = { intrebare: trimmed, top_k: 4 };
      if (selectedDocs.length > 0) {
        body.doc_ids = selectedDocs;
      }

      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Eroare server");
      }

      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.raspuns,
        surse: data.surse ?? [],
        tokens: data.tokens,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: `Eroare: ${err.message || "Nu am putut genera un răspuns."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const toggleDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]
    );
  };

  const selectedDocNames = documente
    .filter((d) => selectedDocs.includes(d.doc_id))
    .map((d) => d.nume_fisier);

  // ─── Render ────────────────────────────────────────────────
  return (
    <ScreenWrapper>
      {/* Setăm zIndex aici ca dropdown-ul să poată pluti peste restul ecranului */}
      <View style={{ flex: 1, backgroundColor: "#f8f7ff", zIndex: 1 }}>
        
        {/* Container special pentru Header + Dropdown ca să aibă z-index prioritar */}
        <View style={{ zIndex: 10, elevation: 10 }}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Chat RAG</Text>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setShowDocPicker(!showDocPicker);
                }}
                style={styles.docFilterBtn}
              >
                <Ionicons name="filter-outline" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.docFilterText} numberOfLines={1}>
                  {selectedDocs.length === 0
                    ? "Toate documentele"
                    : `${selectedDocs.length} doc. selectat${selectedDocs.length > 1 ? "e" : ""}`}
                </Text>
                <Ionicons
                  name={showDocPicker ? "chevron-up" : "chevron-down"}
                  size={13}
                  color="rgba(255,255,255,0.85)"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.headerRight}>
              {messages.length > 0 && (
                <TouchableOpacity
                  onPress={() => setMessages([])}
                  style={styles.clearBtn}
                >
                  <Ionicons name="trash-outline" size={17} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Document picker dropdown (Acum plutește deasupra) ── */}
          {showDocPicker && (
            <View style={styles.docPicker}>
              <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                {loadingDocs ? (
                  <ActivityIndicator size="small" color={COLORS.mainblue} style={{ padding: 16 }} />
                ) : documente.length === 0 ? (
                  <Text style={styles.noDocsText}>
                    Nu ai documente încărcate. Încarcă un document din pagina principală.
                  </Text>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.docPickerItem,
                        selectedDocs.length === 0 && styles.docPickerItemActive,
                      ]}
                      onPress={() => setSelectedDocs([])}
                    >
                      <Ionicons
                        name={selectedDocs.length === 0 ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={selectedDocs.length === 0 ? COLORS.orange : "#9ca3af"}
                      />
                      <Text
                        style={[
                          styles.docPickerItemText,
                          selectedDocs.length === 0 && { color: COLORS.orange, fontWeight: "600" },
                        ]}
                      >
                        Toate documentele
                      </Text>
                    </TouchableOpacity>

                    {documente.map((doc) => {
                      const isSelected = selectedDocs.includes(doc.doc_id);
                      return (
                        <TouchableOpacity
                          key={doc.doc_id}
                          style={[styles.docPickerItem, isSelected && styles.docPickerItemActive]}
                          onPress={() => toggleDoc(doc.doc_id)}
                        >
                          <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={18}
                            color={isSelected ? COLORS.mainblue : "#9ca3af"}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.docPickerItemText} numberOfLines={1}>
                              {doc.nume_fisier}
                            </Text>
                            <Text style={styles.docPickerItemMeta}>
                              {doc.tip_fisier} · {doc.folder}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── Main content area with keyboard handling ── */}
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowDocPicker(false); }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
              {messages.length === 0 ? (
                <EmptyChat
                    selectedDocNames={selectedDocNames}
                    onSuggestion={handleSuggestion}
                    keyboardVisible={keyboardVisible}
                    suggestions={sugestii}
                    loading={loadingSugestii}
                />
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.messageList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => <ChatBubble message={item} />}
                  onContentSizeChange={() =>
                    flatListRef.current?.scrollToEnd({ animated: true })
                  }
                  ListFooterComponent={
                    loading ? (
                      <View style={styles.typingRow}>
                        <View style={styles.assistantAvatarSmall}>
                          <Ionicons name="sparkles" size={12} color="#fff" />
                        </View>
                        <View style={styles.typingBubble}>
                          <TypingDots />
                          <Text style={styles.typingText}>Se generează...</Text>
                        </View>
                      </View>
                    ) : null
                  }
                />
              )}
            </Animated.View>
          </TouchableWithoutFeedback>

          {/* ── Input bar ── */}
          <View style={styles.inputBar}>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder="Pune o întrebare..."
                placeholderTextColor="#9ca3af"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={2000}
                editable={!loading}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!input.trim() || loading) && styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={!input.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={!input.trim() ? "rgba(255,255,255,0.4)" : "#fff"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ScreenWrapper>
  );
}

// ─── Chat Bubble ─────────────────────────────────────────────
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant,
      ]}
    >
      {!isUser && (
        <View style={styles.assistantAvatar}>
          <Ionicons name="sparkles" size={14} color="#fff" />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text style={[styles.bubbleText, isUser && { color: "#fff" }]}>
          {message.text}
        </Text>

        {!isUser && message.surse && message.surse.length > 0 && (
          <View style={styles.sursaContainer}>
            <View style={styles.sursaHeader}>
              <Ionicons name="document-text-outline" size={12} color={COLORS.orange} />
              <Text style={styles.sursaTitle}>Surse ({message.surse.length})</Text>
            </View>
            {message.surse.map((s, i) => (
              <View key={i} style={styles.sursaItem}>
                <Text style={styles.sursaName} numberOfLines={1}>
                  {s.nume_fisier}
                </Text>
                {s.text_preview && (
                  <Text style={styles.sursaPreview} numberOfLines={2}>
                    „{s.text_preview}"
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {!isUser && message.tokens && (
          <Text style={styles.tokenInfo}>{message.tokens} tokens</Text>
        )}
      </View>
    </View>
  );
}

// ─── Empty Chat State ────────────────────────────────────────
function EmptyChat({
  selectedDocNames,
  onSuggestion,
  keyboardVisible,
  suggestions,
  loading,
}: {
  selectedDocNames: string[];
  onSuggestion: (text: string) => void;
  keyboardVisible: boolean;
  suggestions: string[];
  loading: boolean;
}) {
  return (
    <View style={styles.emptyChat}>
      {!keyboardVisible && (
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={styles.emptyChatIconWrap}>
            <View style={styles.emptyChatIconOuter}>
              <View style={styles.emptyChatIconInner}>
                <Ionicons name="chatbubbles" size={32} color={COLORS.mainblue} />
              </View>
            </View>
            <View style={[styles.miniBadge, { top: 2, right: 8, backgroundColor: COLORS.orange }]}>
              <Ionicons name="sparkles" size={10} color="#fff" />
            </View>
            <View style={[styles.miniBadge, { bottom: 4, left: 6, backgroundColor: COLORS.mainblue }]}>
              <Ionicons name="book" size={10} color="#fff" />
            </View>
          </View>
          <Text style={styles.emptyChatTitle}>Începe o conversație</Text>
          <Text style={styles.emptyChatSubtitle}>
            {selectedDocNames.length > 0
              ? `Pune întrebări despre: ${selectedDocNames.join(", ")}`
              : "Pune întrebări din documentele tale și primești răspunsuri bazate pe conținutul lor."}
          </Text>
        </View>
      )}

      {/* Am pus sugestiile într-un ScrollView ca să nu se reverse peste ecran când se deschide tastatura */}
      <ScrollView contentContainerStyle={styles.suggestionsWrap} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!keyboardVisible && (
          <Text style={styles.suggestionsLabel}>Sugestii:</Text>
        )}
        {loading ? (
          <View style={styles.suggestionsLoading}>
            <ActivityIndicator size="small" color={COLORS.orange} />
            <Text style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>
              Se generează sugestii...
            </Text>
          </View>
        ) : (
          suggestions.map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.suggestionChip}
              onPress={() => onSuggestion(s)}
              activeOpacity={0.7}
            >
              <Ionicons name="bulb-outline" size={14} color={COLORS.orange} />
              <Text style={styles.suggestionText}>{s}</Text>
              <Ionicons name="arrow-forward" size={12} color="#c7d2fe" style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Typing Dots ─────────────────────────────────────────────
function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    animate(dot1, 0).start();
    animate(dot2, 200).start();
    animate(dot3, 400).start();
  }, []);

  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
              transform: [
                { scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  /* ── Header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.mainblue,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
    zIndex: 20,
  },
  backBtn: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  docFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  docFilterText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    maxWidth: width * 0.45,
  },
  headerRight: {
    width: 36,
    alignItems: "flex-end",
  },
  clearBtn: {
    padding: 7,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
  },

  /* ── Doc Picker (absolut, overlay) ── */
  docPickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 30,
  },
  docPicker: {
    position: "absolute",
    top: 62, // sub header
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    maxHeight: 280,
    zIndex: 40,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    paddingVertical: 6,
  },
  docPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  docPickerItemActive: {
    backgroundColor: "#fff7ed",
  },
  docPickerItemText: {
    fontSize: 14,
    color: "#1a1a2e",
  },
  docPickerItemMeta: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 1,
  },
  noDocsText: {
    padding: 20,
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
  },

  /* ── Messages ── */
  messageList: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 14,
    maxWidth: "85%",
  },
  bubbleRowUser: {
    alignSelf: "flex-end",
  },
  bubbleRowAssistant: {
    alignSelf: "flex-start",
    gap: 8,
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.mainblue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  assistantAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.mainblue,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  bubbleUser: {
    backgroundColor: COLORS.mainblue,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#ece9ff",
    shadowColor: "#6366f1",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1a1a2e",
  },

  /* ── Surse ── */
  sursaContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0edff",
  },
  sursaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  sursaTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.orange,
  },
  sursaItem: {
    backgroundColor: "#fff7ed",
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },
  sursaName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  sursaPreview: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
    fontStyle: "italic",
  },
  tokenInfo: {
    fontSize: 10,
    color: "#c7d2fe",
    marginTop: 6,
    textAlign: "right",
  },

  /* ── Empty Chat ── */
  emptyChatScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 16,
  },
  emptyChat: {
    paddingHorizontal: 28,
  },
  emptyChatIconWrap: {
    width: 110,
    height: 110,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyChatIconOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.orange,
  },
  emptyChatIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  miniBadge: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  emptyChatTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 6,
  },
  emptyChatSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },
  suggestionsWrap: {
    gap: 8,
  },
  suggestionsLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#ece9ff",
    shadowColor: "#6366f1",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  suggestionText: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
  },
  suggestionsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  suggestionsLoadingText: {
    fontSize: 12,
    color: "#9ca3af",
    marginLeft: 8,
  },

  /* ── Typing ── */
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 4,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ece9ff",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.orange,
  },
  typingText: {
    fontSize: 12,
    color: "#9ca3af",
  },

  /* ── Input bar ── */
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 8 : 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ece9ff",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f8f7ff",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
    fontSize: 15,
    color: "#1a1a2e",
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#ece9ff",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.orange,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: "#fed7aa",
    shadowOpacity: 0,
    elevation: 0,
  },
});
