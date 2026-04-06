import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { useUpload } from "../components/useUpload";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import UploadModal from "../components/UploadModal";
import { useAuth } from "../components/AuthContext";
import ScreenWrapper from "../components/ScreenWrapper";
import { COLORS } from "../../constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const STATS = [
    { label: "Documente", icon: "document-text-outline", color: "#6366f1", bg: "#ede9fe" },
    { label: "Teste date", icon: "checkmark-circle-outline", color: "#10b981", bg: "#d1fae5" },
    { label: "Scor mediu", icon: "trophy-outline", color: "#f59e0b", bg: "#fef3c7" },
];

const QUICK_ACTIONS = [
    { label: "Chat RAG", icon: "chatbubbles-outline", color: "#6366f1", bg: "#ede9fe", screen: "Chat" },
    { label: "Test grilă", icon: "clipboard-outline", color: "#10b981", bg: "#d1fae5", screen: "Test" },
    { label: "Progres", icon: "stats-chart-outline", color: "#f59e0b", bg: "#fef3c7", screen: "Progress" },
];

export default function HomePage({ navigation }: any) {
    const { user, logout } = useAuth();
    const [documente, setDocumente] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [fileToUpload, setFileToUpload] = useState<any>(null);
    // Mock stats — înlocuiește cu date reale din API
    const stats = [documente.length, 12, "78%"];
    const previewDocumente = documente.slice(0, 3);

    useEffect(() => {
        fetchDocumente();
    }, []);

    const fetchDocumente = async () => {
        try {
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

    const handleLogout = async () => {
        await logout();
        navigation.navigate("Login");
    };

   const { pickFile, uploadFile, uploading, progress } = useUpload((newDoc) => {
        setDocumente((prev) => [newDoc, ...prev]);
        setFileToUpload(null); // Închidem modalul automat la succes
    });

    const handleInitiateUpload = async () => {
        const asset = await pickFile(); // Deschide sistemul nativ
        if (asset) {
            setFileToUpload(asset); // Dacă a ales un fișier, deschide modalul
        }
    };

    const handleConfirmUpload = async (folder: string) => {
        if (fileToUpload) {
            await uploadFile(fileToUpload, folder); // Trimite la backend
        }
    };

    return (
        <ScreenWrapper>
            <View style={{ flex: 1, backgroundColor: "#f8f7ff" }}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>
                                {user?.username?.[0]?.toUpperCase() ?? "U"}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.greeting}>Bine ai venit, {user?.username}! 👋</Text>
                            <Text style={styles.subGreeting}>Sa incepem sa invatam!</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <Ionicons name="log-out-outline" size={20} color="#ffffff" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={{ paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.mainblue} />
                        </View>
                    ) : (
                        <>
                            {/* ── Stats ── */}
                            <View style={styles.statsRow}>
                                {STATS.map((s, i) => (
                                    <View key={s.label} style={styles.statCard}>
                                        <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                                            <Ionicons name={s.icon as any} size={20} color={s.color} />
                                        </View>
                                        <Text style={styles.statValue}>{stats[i]}</Text>
                                        <Text style={styles.statLabel}>{s.label}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* ── Acces rapid ── */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Acces rapid</Text>
                                <View style={styles.quickActionsRow}>
                                    {QUICK_ACTIONS.map((a) => (
                                        <TouchableOpacity
                                            key={a.label}
                                            style={[styles.quickCard, { backgroundColor: a.bg }]}
                                            activeOpacity={0.8}
                                            onPress={() => navigation.navigate(a.screen)}
                                        >
                                            <View style={[styles.quickIconWrap, { backgroundColor: a.bg }]}>
                                                <Ionicons name={a.icon as any} size={24} color={a.color} />
                                            </View>
                                            <Text style={styles.quickLabel}>{a.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* ── Biblioteca ── */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Biblioteca ta</Text>
                                    <TouchableOpacity
                                        style={[styles.uploadBtn, uploading && { opacity: 0.7 }]}
                                        onPress={() => navigation.navigate("LibraryPage")}
                                        disabled={uploading}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="library-outline" size={16} color="#fff" />
                                        <Text style={styles.uploadBtnText}>Vizualizeaza biblioteca</Text>
                                    </TouchableOpacity>
                                </View>

                                {previewDocumente.length === 0 ? (
                                    <EmptyState onUpload={handleInitiateUpload} uploading={uploading} progress={progress} />
                                ) : (
                                    <View style={{ gap: 10 }}>
                                        {previewDocumente.map((doc) => (
                                            <DocCard key={doc.doc_id} doc={doc} navigation={navigation} />
                                        ))}
                                        {/* Buton dashed la final */}
                                        <TouchableOpacity
                                             style={[styles.dashedBtn, uploading && { opacity: 0.6 }]}
                                             onPress={handleInitiateUpload}
                                             disabled={uploading}
                                             activeOpacity={0.8}
                                        >
                                            <Ionicons name="add-circle-outline" size={20} color={COLORS.mainblue} />
                                            <Text style={styles.dashedBtnText}>Adaugă document nou</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </>
                    )}
                </ScrollView>
            <UploadModal
                visible={!!fileToUpload}
                onClose={() => setFileToUpload(null)}
                onConfirm={handleConfirmUpload}
                uploading={uploading}
            />
            </View>
        </ScreenWrapper>
    );
}

/* ── Doc Card ── */
function DocCard({ doc, navigation }: { doc: any; navigation: any }) {
    const ext = doc.tip_fisier?.toUpperCase() ?? "PDF";
    let iconColor = "#6b7280";
    let iconBg = "#f3f4f6";
    if (ext === "PDF") {
        iconColor = COLORS.orange;
        iconBg = "#fee2e2";
    } else if (ext === "DOCX") {
        iconColor = COLORS.mainblue;
        iconBg = "#dbeafe";
    } else if (ext === "PPT" || ext === "PPTX") {
        iconColor = "#a259d9"; // mov
        iconBg = "#ede9fe"; // mov deschis
    }

    return (
        <View style={styles.docCard}>
            <View style={[styles.docIcon, { backgroundColor: iconBg }]}>
                <Ionicons name="document-text-outline" size={24} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.docName} numberOfLines={1}>{doc.nume_fisier}</Text>
                <Text style={styles.docMeta}>{ext} · {doc.folder}</Text>
            </View>
            <View style={styles.docActions}>
                <TouchableOpacity
                    style={[styles.docActionBtn, { borderColor: "#6366f1" }]}
                    onPress={() => navigation.navigate("Chat", { docId: doc.doc_id })}
                >
                    <Ionicons name="chatbubble-outline" size={14} color="#6366f1" />
                    <Text style={[styles.docActionText, { color: "#6366f1" }]}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.docActionBtn, { borderColor: "#10b981" }]}
                    onPress={() => navigation.navigate("Test", { docId: doc.doc_id })}
                >
                    <Ionicons name="clipboard-outline" size={14} color="#10b981" />
                    <Text style={[styles.docActionText, { color: "#10b981" }]}>Test</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

/* ── Empty State ── */
function EmptyState({ onUpload, uploading, progress }: any) {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.illustrationWrapper}>
                <View style={styles.outerCircle}>
                    <View style={styles.innerCircle}>
                        <Ionicons name="document-text-outline" size={52} color={COLORS.mainblue} />
                    </View>
                </View>
                {[
                    { icon: "chatbubble-ellipses", pos: styles.badgeTopRight },
                    { icon: "school", pos: styles.badgeBottomLeft },
                    { icon: "stats-chart", pos: styles.badgeBottomRight },
                ].map((b) => (
                    <View key={b.icon} style={[styles.floatingBadge, b.pos]}>
                        <Ionicons name={b.icon as any} size={16} color="#fff" />
                    </View>
                ))}
            </View>
            <Text style={styles.emptyTitle}>Niciun document încărcat</Text>
            <Text style={styles.emptySubtitle}>
                Încarcă primul tău document PDF, DOCX sau TXT și începe să înveți asistat de AI.
            </Text>
            <TouchableOpacity
                style={[styles.addButton, uploading && { opacity: 0.7 }]}
                onPress={onUpload}
                disabled={uploading}
                activeOpacity={0.85}
            >
                {uploading ? (
                    <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.addButtonText}>
                            {progress < 100 ? `${progress}%` : "Procesare..."}
                        </Text>
                    </>
                ) : (
                    <>
                        <Ionicons name="add" size={22} color="#fff" />
                        <Text style={styles.addButtonText}>Adaugă document</Text>
                    </>
                )}
            </TouchableOpacity>
            <Text style={styles.hint}>Suportă PDF · DOCX · TXT</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    /* ── Header ── */
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        backgroundColor: COLORS.mainblue,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.25)",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
    },
    greeting: {
        fontSize: 18,
        fontWeight: "700",
        color: "#ffffff",
    },
    subGreeting: {
        fontSize: 12,
        color: "rgba(255,255,255,0.75)",
        fontWeight: "500",
    },
    logoutBtn: {
        padding: 9,
        backgroundColor: COLORS.orange,
        borderRadius: 12,
        elevation: 2,
    },

    /* ── Loading ── */
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
    },

    /* ── Stats ── */
    statsRow: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 4,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 14,
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: "#ece9ff",
        shadowColor: "#6366f1",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    statIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    statValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    statLabel: {
        fontSize: 11,
        color: "#9ca3af",
        fontWeight: "500",
        textAlign: "center",
    },

    /* ── Sections ── */
    section: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a2e",
        marginBottom: 14,
    },

    /* ── Quick Actions ── */
    quickActionsRow: {
        flexDirection: "row",
        gap: 12,
    },
    quickCard: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderColor: "#ece9ff",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    quickIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    quickLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1a1a2e",
        textAlign: "center",
    },

    /* ── Upload button (inline header) ── */
    uploadBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: COLORS.mainblue,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    uploadBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#fff",
    },

    /* ── Doc Card ── */
    docCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: "#ece9ff",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    docIcon: {
        width: 46,
        height: 46,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    docName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1a1a2e",
        marginBottom: 3,
    },
    docMeta: {
        fontSize: 12,
        color: "#9ca3af",
    },
    docActions: {
        flexDirection: "row",
        gap: 6,
    },
    docActionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: "#fff",
    },
    docActionText: {
        fontSize: 12,
        fontWeight: "600",
    },

    /* ── Dashed add button ── */
    dashedBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: "#c7d2fe",
        borderRadius: 14,
        padding: 14,
        backgroundColor: "transparent",
    },
    dashedBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.mainblue,
    },

    /* ── Empty State ── */
    emptyContainer: {
        alignItems: "center",
        paddingTop: 20,
        paddingHorizontal: 16,
    },
    illustrationWrapper: {
        width: 190,
        height: 190,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 28,
    },
    outerCircle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: COLORS.orange,
        alignItems: "center",
        justifyContent: "center",
    },
    innerCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.mainblue,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    floatingBadge: {
        position: "absolute",
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: COLORS.mainblue,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#040f45",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    badgeTopRight: { top: 12, right: 10 },
    badgeBottomLeft: { bottom: 18, left: 6 },
    badgeBottomRight: { bottom: 10, right: 18 },

    emptyTitle: {
        fontSize: 21,
        fontWeight: "700",
        color: "#1a1a2e",
        textAlign: "center",
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#6b7280",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 32,
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.mainblue,
        paddingVertical: 15,
        paddingHorizontal: 36,
        borderRadius: 16,
        shadowColor: COLORS.mainblue,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
        marginBottom: 16,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
    hint: {
        fontSize: 12,
        color: "#9ca3af",
        letterSpacing: 0.5,
        marginTop: 8,
    },
});
