import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function useUpload(onSuccess: (doc: any) => void) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    "application/pdf",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/vnd.ms-powerpoint", // .ppt
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
                    "text/plain",
                ],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const asset = result.assets[0];

            if (asset.size && asset.size > 20 * 1024 * 1024) {
                Alert.alert("Fișier prea mare", "Dimensiunea maximă este 20MB.");
                return;
            }

            return asset;
        } catch (e) {
            Alert.alert("Eroare", "Nu s-a putut selecta fișierul.");
        }
    };

    const uploadFile = async (asset: DocumentPicker.DocumentPickerAsset, folder: string) => {
        setUploading(true);
        setProgress(0);

        const token = await AsyncStorage.getItem("token");

        const formData = new FormData();
        formData.append("file", {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType ?? "application/octet-stream",
        } as any);
        formData.append("folder", folder);

        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    setProgress(Math.round((e.loaded / e.total) * 100));
                }
            });

            xhr.addEventListener("load", () => {
                setUploading(false);
                if (xhr.status === 200 || xhr.status === 201) {
                    const raw = JSON.parse(xhr.responseText);
                    const doc = {
                        doc_id:      raw.doc_id,
                        nume_fisier: raw.nume_fisier,
                        folder:      raw.folder,
                        tip_fisier:  raw.tip_fisier,
                    };
                    onSuccess(doc); // Aici vom închide și modalul din HomePage
                    Alert.alert("✅ Succes", `„${asset.name}" a fost salvat în „${folder}"!`);
                    resolve();
                } else {
                    let mesaj = "Upload eșuat.";
                    try {
                        const body = JSON.parse(xhr.responseText);
                        if (Array.isArray(body.detail)) {
                            mesaj = body.detail.map((e: any) => `${e.loc?.join(".")} — ${e.msg}`).join("\n");
                        } else {
                            mesaj = body.detail ?? mesaj;
                        }
                    } catch {}
                    Alert.alert(`Eroare ${xhr.status}`, mesaj);
                    reject();
                }
            });

            xhr.addEventListener("error", () => {
                setUploading(false);
                Alert.alert("Eroare", "Eroare de rețea. Verifică conexiunea.");
                reject();
            });

            xhr.open("POST", `${API_URL}/upload-curs`);
            if (token) {
                xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            }
            xhr.send(formData);
        });
    };

    return { pickFile, uploadFile, uploading, progress };
}