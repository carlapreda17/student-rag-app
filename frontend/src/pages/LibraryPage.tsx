import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    RefreshControl
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../components/AuthContext";
import { COLORS } from "../../constants/theme";
import ScreenWrapper from "../components/ScreenWrapper";
import { useUpload } from "../components/useUpload";
import UploadModal from "../components/UploadModal";
import BackButton from "../components/BackButton";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const FILTER_TABS = ["Toate", "PDF", "DOCX", "TXT", "PPT"];

const decodeName = (name: string) => { try { return decodeURIComponent(name); } catch { return name; } };

// ── Tipuri ──
type FileType = "PDF" | "DOCX" | "TXT" | "PPT" | "PPTX";
interface Document {
    doc_id: string;
    nume_fisier: string;
    folder: string;
    tip_fisier: FileType;
}

// ── Componentă Ajutătoare: Iconiță Fișier ──
const FileIcon = ({ type }: { type: FileType }) => {
    const ext = type.toUpperCase();
    const isPDF = ext === "PDF";
    const isTXT = ext === "TXT";
    const isPPT = ext === "PPT" || ext === "PPTX";

    let bgColor = "#eff6ff"; // Default albastru deschis (DOCX)
    let iconColor = COLORS.mainblue;
    let iconName: any = "document-text";

    if (isPDF) {
        bgColor = "#fee2e2";
        iconColor = COLORS.orange;
        iconName = "document";
    } else if (isTXT) {
        bgColor = "#f3f4f6";
        iconColor = COLORS.darkGrey;
        iconName = "reader-outline";
    } else if (isPPT) {
        bgColor = "#ede9fe"; // mov deschis
        iconColor = "#a259d9"; // mov
        iconName = "easel-outline";
    }

    return (
        <View style={[styles.fileIcon, { backgroundColor: bgColor }]}>
            <Ionicons name={iconName} size={22} color={iconColor} />
        </View>
    );
};

export default function LibraryPage({ navigation }: any) {
    const { user, logout } = useAuth();

    const [activeFilter, setActiveFilter] = useState("Toate");
    const [search, setSearch] = useState("");

    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Upload logic
    const [fileToUpload, setFileToUpload] = useState<any>(null);
    const { pickFile, uploadFile, uploading, progress } = useUpload((newDoc) => {
        setDocuments((prev) => [newDoc, ...prev]);
        setFileToUpload(null);
    });

    const handleInitiateUpload = async () => {
        const asset = await pickFile();
        if (asset) {
            setFileToUpload(asset);
        }
    };

    const handleConfirmUpload = async (folder: string) => {
        if (fileToUpload) {
            await uploadFile(fileToUpload, folder);
        }
    };

    // ── Preia documentele ──
    const fetchDocuments = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            const response = await fetch(`${API_URL}/documente`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setDocuments(data.documente || []);
        } catch (error) {
            console.error("Eroare fetch documente:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDocuments();
    };

    // Înlocuiește cu deschiderea modalului de upload
    const handleUpload = handleInitiateUpload;

    const handleDelete = (docId: string, nume: string) => {
        Alert.alert(
            "Șterge documentul",
            `Ești sigur că vrei să ștergi "${nume}"?`,
            [
                { text: "Anulează", style: "cancel" },
                {
                    text: "Șterge",
                    style: "destructive",
                    onPress: () => {
                        // TODO: Integrare request DELETE către backend
                        setDocuments(prev => prev.filter(d => d.doc_id !== docId));
                    }
                }
            ]
        );
    };

    // ── Logica de Filtrare și Grupare ──
    const filteredDocs = documents.filter((doc) => {
        // Filtru după search (titlu sau folder)
        const matchesSearch = decodeName(doc.nume_fisier).toLowerCase().includes(search.toLowerCase()) ||
                              doc.folder.toLowerCase().includes(search.toLowerCase());
        // Filtru după tab (PDF, DOCX, TXT, PPT)
        const docType = doc.tip_fisier.toUpperCase();
        const matchesTab = activeFilter === "Toate" || 
                          docType === activeFilter ||
                          (activeFilter === "PPT" && (docType === "PPT" || docType === "PPTX"));
        
        return matchesSearch && matchesTab;
    });

    const groupedDocs = filteredDocs.reduce<Record<string, Document[]>>((acc, doc) => {
        if (!acc[doc.folder]) acc[doc.folder] = [];
        acc[doc.folder].push(doc);
        return acc;
    }, {});

    return (
        <ScreenWrapper headerColor={COLORS.mainblue}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Biblioteca mea 📚</Text>
                    <Text style={styles.headerSub}>
                        {documents.length === 0
                            ? "Niciun document"
                            : `${documents.length} document${documents.length > 1 ? "e" : ""}`}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={handleUpload}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={26} color="#fff" />
                </TouchableOpacity>
                <BackButton color="#f8fafc" onPress={() => navigation.goBack()} />
            </View>

            {/* ── Search Bar ── */}
            <View style={styles.searchWrapper}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={18} color="#9ca3af" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Caută document sau folder..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch("")}>
                            <Ionicons name="close-circle" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── Filter Tabs ── */}
            <View style={styles.filterRow}>
                {FILTER_TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[
                            styles.filterTab,
                            activeFilter === tab && styles.filterTabActive,
                        ]}
                        onPress={() => setActiveFilter(tab)}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.filterTabText,
                                activeFilter === tab && styles.filterTabTextActive,
                            ]}
                        >
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Content ── */}
            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={COLORS.orange} />
                    <Text style={{ marginTop: 12, color: COLORS.gray }}>Se încarcă biblioteca...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.mainblue} />}
                >
                    {documents.length === 0 ? (
                        <EmptyState onUpload={handleUpload} />
                    ) : filteredDocs.length === 0 ? (
                        <View style={styles.centerContent}>
                            <Text style={{ fontSize: 40, marginBottom: 10 }}>🔍</Text>
                            <Text style={{ fontSize: 16, color: COLORS.gray, fontWeight: "500" }}>Niciun rezultat găsit</Text>
                        </View>
                    ) : (
                        Object.entries(groupedDocs).map(([folder, docs]) => (
                            <View key={folder} style={styles.folderGroup}>
                                <View style={styles.folderHeader}>
                                    <Ionicons name="folder-open" size={16} color={COLORS.gray} />
                                    <Text style={styles.folderLabel}>{folder}</Text>
                                </View>

                                {docs.map((doc) => (
                                    <View key={doc.doc_id} style={styles.docCard}>
                                        <View style={styles.docTopRow}>
                                            <FileIcon type={doc.tip_fisier} />
                                            <View style={styles.docInfo}>
                                                <Text style={styles.docName} numberOfLines={2}>{decodeName(doc.nume_fisier)}</Text>
                                                <Text style={styles.docMeta}>{doc.tip_fisier.toUpperCase()} · {doc.folder}</Text>
                                            </View>
                                            
                                            {/* Delete Button */}
                                            <TouchableOpacity 
                                                onPress={() => handleDelete(doc.doc_id, decodeName(doc.nume_fisier))}
                                                style={styles.deleteIconBtn}
                                            >
                                                <Ionicons name="trash-outline" size={18} color={COLORS.brightRed} />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Acțiuni Rapide pentru Document */}
                                        <View style={styles.docActions}>
                                            <TouchableOpacity 
                                                style={[styles.actionBtn, { borderColor: COLORS.mainblue, backgroundColor: "#eff6ff" }]}
                                                onPress={() => navigation.navigate("Chat", { docId: doc.doc_id })}
                                            >
                                                <Ionicons name="chatbubbles-outline" size={14} color={COLORS.mainblue} />
                                                <Text style={[styles.actionText, { color: COLORS.mainblue }]}>Întreabă AI</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity 
                                                style={[styles.actionBtn, { borderColor: COLORS.green, backgroundColor: "#f0fdf4" }]}
                                                onPress={() => navigation.navigate("Test", { docId: doc.doc_id })}
                                            >
                                                <Ionicons name="school-outline" size={14} color={COLORS.green} />
                                                <Text style={[styles.actionText, { color: COLORS.green }]}>Dă un test</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        {/* Upload Modal */}
        <UploadModal
            visible={!!fileToUpload}
            onClose={() => setFileToUpload(null)}
            onConfirm={handleConfirmUpload}
            uploading={uploading}
        />
        </ScreenWrapper>
    );
}

/* ── Empty State Component ── */
function EmptyState({ onUpload }: { onUpload: () => void }) {
    return (
        <View style={emptyStyles.container}>
            {/* Ilustrație */}
            <View style={emptyStyles.illustrationWrapper}>
                <View style={emptyStyles.outerCircle}>
                    <View style={emptyStyles.innerCircle}>
                        <Ionicons name="folder-open-outline" size={52} color={COLORS.mainblue} />
                    </View>
                </View>
                {/* Badges flotante */}
                <View style={[emptyStyles.badge, emptyStyles.badgeTopRight]}>
                    <Ionicons name="document-text" size={15} color="#fff" />
                </View>
                <View style={[emptyStyles.badge, emptyStyles.badgeBottomLeft]}>
                    <Ionicons name="cloud-upload" size={15} color="#fff" />
                </View>
                <View style={[emptyStyles.badge, emptyStyles.badgeBottomRight]}>
                    <Ionicons name="folder" size={15} color="#fff" />
                </View>
                {/* Puncte decorative */}
                <View style={[emptyStyles.dot, { width: 10, height: 10, top: 18, left: 18 }]} />
                <View style={[emptyStyles.dot, { width: 7, height: 7, top: 58, right: 2 }]} />
                <View style={[emptyStyles.dot, { width: 12, height: 12, bottom: 28, left: 28 }]} />
            </View>
            {/* Text */}
            <Text style={emptyStyles.title}>Biblioteca e goală</Text>
            <Text style={emptyStyles.subtitle}>
                Încarcă documente PDF, DOCX, PPT sau TXT și organizează-le pe foldere.
            </Text>
            {/* CTA Principal */}
            <TouchableOpacity
                style={emptyStyles.uploadBtn}
                onPress={onUpload}
                activeOpacity={0.85}
            >
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                <Text style={emptyStyles.uploadBtnText}>Încarcă document</Text>
            </TouchableOpacity>
            {/* Formate suportate */}
            <View style={emptyStyles.formatsRow}>
                {["PDF", "DOCX", "PPT", "TXT"].map((fmt) => (
                    <View key={fmt} style={emptyStyles.formatBadge}>
                        <Text style={emptyStyles.formatText}>{fmt}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

/* ────────────────── Styles ────────────────── */
const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: COLORS.mainblue,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 20,
    },
    headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
    headerSub: { fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 2 },
    addBtn: {
        width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.orange,
        alignItems: "center", justifyContent: "center",
        shadowColor: COLORS.orange, shadowOpacity: 0.4, shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 }, elevation: 4,
    },
    searchWrapper: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    searchBar: {
        flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 8,
        shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    searchInput: { flex: 1, fontSize: 14, color: "#1a1a2e" },
    filterRow: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 12 },
    filterTab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#ede9fe" },
    filterTabActive: { backgroundColor: COLORS.mainblue },
    filterTabText: { fontSize: 13, fontWeight: "600", color: COLORS.mainblue },
    filterTabTextActive: { color: "#fff" },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
    centerContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
    
    // Lista Documente
    folderGroup: { marginBottom: 24 },
    folderHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginLeft: 4 },
    folderLabel: { fontSize: 12, fontWeight: "700", color: COLORS.gray, textTransform: "uppercase", letterSpacing: 1 },
    
    docCard: {
        backgroundColor: "#fff", borderWidth: 1, borderColor: "#ece9ff",
        borderRadius: 16, padding: 14, marginBottom: 12,
        shadowColor: "#6366f1", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    docTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    fileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    docInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
    docName: { fontSize: 15, fontWeight: "700", color: "#1a1a2e", marginBottom: 4 },
    docMeta: { fontSize: 12, color: COLORS.gray },
    deleteIconBtn: { padding: 8, backgroundColor: "#fef2f2", borderRadius: 10 },
    
    docActions: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "#f8f7ff", paddingTop: 12 },
    actionBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    },
    actionText: { fontSize: 13, fontWeight: "700" },
});

const emptyStyles = StyleSheet.create({
    container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingTop: 40 },
    illustrationWrapper: { width: 200, height: 200, alignItems: "center", justifyContent: "center", marginBottom: 32 },
    outerCircle: { width: 155, height: 155, borderRadius: 80, backgroundColor: COLORS.orange, alignItems: "center", justifyContent: "center" },
    innerCircle: {
        width: 98, height: 98, borderRadius: 50, backgroundColor: "#fff",
        alignItems: "center", justifyContent: "center",
        shadowColor: COLORS.mainblue, shadowOpacity: 0.2, shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 }, elevation: 4,
    },
    badge: {
        position: "absolute", width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.mainblue,
        alignItems: "center", justifyContent: "center", shadowColor: COLORS.mainblue,
        shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
    },
    badgeTopRight: { top: 10, right: 10 },
    badgeBottomLeft: { bottom: 16, left: 8 },
    badgeBottomRight: { bottom: 8, right: 18 },
    dot: { position: "absolute", borderRadius: 99, backgroundColor: COLORS.mainblue, opacity: 0.2 },
    title: { fontSize: 22, fontWeight: "700", color: "#1a1a2e", textAlign: "center", marginBottom: 12 },
    subtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22, marginBottom: 36 },
    uploadBtn: {
        flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.mainblue,
        paddingVertical: 16, paddingHorizontal: 36, borderRadius: 16,
        shadowColor: COLORS.mainblue, shadowOpacity: 0.4, shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 }, elevation: 5, marginBottom: 20,
    },
    uploadBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
    formatsRow: { flexDirection: "row", gap: 8 },
    formatBadge: { paddingVertical: 5, paddingHorizontal: 14, backgroundColor: "#ede9fe", borderRadius: 20 },
    formatText: { fontSize: 12, fontWeight: "600", color: COLORS.mainblue },
});