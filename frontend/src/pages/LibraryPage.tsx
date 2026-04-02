import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../components/AuthContext";
import { COLORS } from "../../constants/theme";
import ScreenWrapper from "../components/ScreenWrapper";

const FILTER_TABS = ["Toate", "PDF", "DOCX", "TXT"];

export default function LibraryPage({ navigation }: any) {
    const [activeFilter, setActiveFilter] = useState("Toate");
    const [search, setSearch] = useState("");
    const { user, logout } = useAuth();


    // Momentan gol — îl populăm când conectăm backend-ul
    const documents: any[] = [];

    const handleUpload = () => {
        navigation.navigate("HomePage");
        
    };

    return (
        <ScreenWrapper>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Biblioteca mea 📚</Text>
                        <Text style={styles.headerSub}>
                            {documents.length === 0
                                ? "Niciun document"
                                : `${documents.length} documente`}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={handleUpload}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add" size={26} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* ── Search Bar ── */}
                <View style={styles.searchWrapper}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={18} color="#9ca3af" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Caută document..."
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
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {documents.length === 0 ? (
                        <EmptyState onUpload={handleUpload} />
                    ) : (
                        // TODO: lista documente
                        null
                    )}
                </ScrollView>
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
                Încarcă documente PDF, DOCX sau TXT și organizează-le pe cursuri și materii.
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
                {["PDF", "DOCX", "TXT"].map((fmt) => (
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
    /* Header */
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: COLORS.mainblue,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#fff",
    },
    headerSub: {
        fontSize: 13,
        color: "rgba(255,255,255,0.65)",
        marginTop: 2,
    },
    addBtn: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: COLORS.orange,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.orange,
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },

    /* Search */
    searchWrapper: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: "#1a1a2e",
    },

    /* Filter Tabs */
    filterRow: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 8,
        marginBottom: 8,
    },
    filterTab: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: "#ede9fe",
    },
    filterTabActive: {
        backgroundColor: COLORS.mainblue,
    },
    filterTabText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.mainblue,
    },
    filterTabTextActive: {
        color: "#fff",
    },

    /* Scroll */
    scrollContent: {
        flexGrow: 1,
    },
});

const emptyStyles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingTop: 40,
    },

    /* Ilustrație */
    illustrationWrapper: {
        width: 200,
        height: 200,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 32,
    },
    outerCircle: {
        width: 155,
        height: 155,
        borderRadius: 80,
        backgroundColor: COLORS.orange,
        alignItems: "center",
        justifyContent: "center",
    },
    innerCircle: {
        width: 98,
        height: 98,
        borderRadius: 50,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.mainblue,
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    badge: {
        position: "absolute",
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: COLORS.mainblue,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.mainblue,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    badgeTopRight: { top: 10, right: 10 },
    badgeBottomLeft: { bottom: 16, left: 8 },
    badgeBottomRight: { bottom: 8, right: 18 },
    dot: {
        position: "absolute",
        borderRadius: 99,
        backgroundColor: COLORS.mainblue,
        opacity: 0.2,
    },

    /* Text */
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1a1a2e",
        textAlign: "center",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 14,
        color: "#6b7280",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 36,
    },

    /* Buton */
    uploadBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.mainblue,
        paddingVertical: 16,
        paddingHorizontal: 36,
        borderRadius: 16,
        shadowColor: COLORS.mainblue,
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
        marginBottom: 20,
    },
    uploadBtnText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },

    /* Format badges */
    formatsRow: {
        flexDirection: "row",
        gap: 8,
    },
    formatBadge: {
        paddingVertical: 5,
        paddingHorizontal: 14,
        backgroundColor: "#ede9fe",
        borderRadius: 20,
    },
    formatText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.mainblue,
    },
});
