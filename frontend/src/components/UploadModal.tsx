import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface UploadModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (folder: string) => void;
    uploading: boolean;
}

export default function UploadModal({ visible, onClose, onConfirm, uploading }: UploadModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedFolder, setSelectedFolder] = useState<string>("");
    const [newFolderName, setNewFolderName] = useState("");
    const [folders, setFolders] = useState<string[]>([]);
    const [loadingFolders, setLoadingFolders] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchFolders();
            setStep(1);
            setSelectedFolder("");
            setNewFolderName("");
        }
    }, [visible]);

    const fetchFolders = async () => {
        setLoadingFolders(true);
        try {
            const token = await AsyncStorage.getItem("token");
            const response = await fetch(`${API_URL}/documente`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            const uniqueFolders = [...new Set(
                data.documente?.map((d: any) => d.folder).filter(Boolean) || []
            )] as string[];

            setFolders(uniqueFolders);
        } catch (err) {
            console.error("Eroare fetch foldere:", err);
        } finally {
            setLoadingFolders(false);
        }
    };

    const handleConfirm = () => {
        onConfirm(selectedFolder || "General");
    };

    const handleCreateFolder = () => {
        const name = newFolderName.trim();
        if (!name) return;

        setSelectedFolder(name);
        if (!folders.includes(name)) {
            setFolders((prev) => [name, ...prev]);
        }
        setStep(1);
        setNewFolderName("");
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.modalWrapper}
                >
                    <View style={styles.modal}>
                        <View style={styles.handleBar} />

                        {/* ══════════ STEP 1: Alege folder ══════════ */}
                        {step === 1 && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalTitle}>Unde salvăm documentul?</Text>
                                        <Text style={styles.modalSub}>Alege un folder sau creează unul nou</Text>
                                    </View>
                                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                        <Ionicons name="close" size={22} color="#83829A" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView
                                    style={{ maxHeight: 340 }}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingBottom: 8 }}
                                >
                                     {/* Creează folder nou */}
                                    <TouchableOpacity
                                        style={styles.newFolderBtn}
                                        onPress={() => setStep(2)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.folderIcon, { backgroundColor: "#dbeafe" }]}>
                                            <Ionicons name="add" size={22} color={COLORS.mainblue} />
                                        </View>
                                        <Text style={styles.newFolderBtnText}>Creează folder nou</Text>
                                        <Ionicons name="chevron-forward" size={18} color={COLORS.mainblue} />
                                    </TouchableOpacity>

                                    
                                    {/* General — mereu prezent */}
                                    <TouchableOpacity
                                        style={[styles.folderCard, selectedFolder === "General" && styles.folderCardSelected]}
                                        onPress={() => setSelectedFolder("General")}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.folderIcon, { backgroundColor: "#f3f4f6" }]}>
                                            <Ionicons name="albums-outline" size={22} color="#9ca3af" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.folderName}>General</Text>
                                            <Text style={styles.folderDesc}>Fără categorie specifică</Text>
                                        </View>
                                        {selectedFolder === "General" && (
                                            <Ionicons name="checkmark-circle" size={22} color={COLORS.orange} />
                                        )}
                                    </TouchableOpacity>

                                    {/* Folderele existente */}
                                    {loadingFolders ? (
                                        <ActivityIndicator size="small" color={COLORS.mainblue} style={{ marginVertical: 20 }} />
                                    ) : (
                                        folders
                                            .filter((f) => f !== "General")
                                            .map((folder) => (
                                                <TouchableOpacity
                                                    key={folder}
                                                    style={[styles.folderCard, selectedFolder === folder && styles.folderCardSelected]}
                                                    onPress={() => setSelectedFolder(folder)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[styles.folderIcon, { backgroundColor: "#ede9fe" }]}>
                                                        <Ionicons name="folder" size={22} color="#6366f1" />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.folderName}>{folder}</Text>
                                                    </View>
                                                    {selectedFolder === folder && (
                                                        <Ionicons name="checkmark-circle" size={22} color={COLORS.orange} />
                                                    )}
                                                </TouchableOpacity>
                                            ))
                                    )}

                                   
                                </ScrollView>

                                {/* Confirmă */}
                                <TouchableOpacity
                                    style={[styles.confirmBtn, !selectedFolder && styles.confirmBtnDisabled]}
                                    onPress={handleConfirm}
                                    disabled={!selectedFolder || uploading}
                                    activeOpacity={0.8}
                                >
                                    {uploading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                                            <Text style={styles.confirmBtnText}>
                                                Selectează fișierul{selectedFolder ? ` → ${selectedFolder}` : ""}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ══════════ STEP 2: Creează folder nou ══════════ */}
                        {step === 2 && (
                            <>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity onPress={() => setStep(1)} style={styles.backStepBtn}>
                                        <Ionicons name="arrow-back" size={20} color={COLORS.mainblue} />
                                    </TouchableOpacity>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalTitle}>Folder nou</Text>
                                        <Text style={styles.modalSub}>Scrie numele folderului</Text>
                                    </View>
                                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                        <Ionicons name="close" size={22} color="#83829A" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.fieldLabel}>Nume folder</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="folder-open-outline" size={18} color="#9ca3af" style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ex: Inteligență Artificială"
                                        placeholderTextColor="#9ca3af"
                                        value={newFolderName}
                                        onChangeText={setNewFolderName}
                                        autoFocus
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.confirmBtn, !newFolderName.trim() && styles.confirmBtnDisabled, { marginTop: 24 }]}
                                    onPress={handleCreateFolder}
                                    disabled={!newFolderName.trim()}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                    <Text style={styles.confirmBtnText}>Creează și selectează</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalWrapper: {
        justifyContent: "flex-end",
    },
    modal: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === "ios" ? 40 : 24,
        paddingTop: 12,
        maxHeight: "80%",
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#e5e7eb",
        alignSelf: "center",
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    modalSub: {
        fontSize: 13,
        color: "#83829A",
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    backStepBtn: {
        padding: 6,
        backgroundColor: "#f0f0ff",
        borderRadius: 10,
    },
    folderCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: "#f3f4f6",
        marginBottom: 8,
        backgroundColor: "#fff",
    },
    folderCardSelected: {
        borderColor: COLORS.orange,
        backgroundColor: "#fff7ed",
    },
    folderIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    folderName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1a1a2e",
    },
    folderDesc: {
        fontSize: 12,
        color: "#9ca3af",
        marginTop: 2,
    },
    newFolderBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: "#c7d2fe",
        marginBottom: 8,
    },
    newFolderBtnText: {
        flex: 1,
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.mainblue,
    },
    confirmBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: COLORS.mainblue,
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 16,
        shadowColor: COLORS.mainblue,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    confirmBtnDisabled: {
        backgroundColor: "#c7d2fe",
        shadowOpacity: 0,
        elevation: 0,
    },
    confirmBtnText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1a1a2e",
        marginBottom: 10,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f7ff",
        borderWidth: 1.5,
        borderColor: "#ece9ff",
        borderRadius: 14,
        paddingHorizontal: 14,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: "#1a1a2e",
    },
});