import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    Dimensions
} from "react-native";
import { COLORS } from "../../constants/theme";
import CustomInput from "../components/CustomInput";
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface ValidationErrors {
    username?: string;
    email?: string;
    phone?: string;
    password?: string;
    general?: string;
}

export default function Register({ navigation }: any) {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [errors, setErrors] = useState<ValidationErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    const validate = (): boolean => {
        let isValid = true;
        let newErrors: ValidationErrors = {};

        if (!username.trim()) {
            newErrors.username = "Numele de utilizator este obligatoriu";
            isValid = false;
        } else if (!/^[a-zA-Z0-9]+([._]?[a-zA-Z0-9]+)*$/.test(username)) {
            newErrors.username = "Format invalid (doar litere, cifre, . și _)";
            isValid = false;
        }

        if (!email.trim()) {
            newErrors.email = "Email-ul este obligatoriu";
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = "Adresa de email este invalidă";
            isValid = false;
        }

        if (!phone.trim()) {
            newErrors.phone = "Telefonul este obligatoriu";
            isValid = false;
        } else if (!/^07\d{8}$/.test(phone)) {
            newErrors.phone = "Format invalid (ex: 07xxxxxxxx, 10 cifre)";
            isValid = false;
        }

        if (!password) {
            newErrors.password = "Parola este obligatorie";
            isValid = false;
        } else if (
            !/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[A-Za-z\d!@#$%^&*()]{8,}$/.test(
                password
            )
        ) {
            newErrors.password =
                "Minim 8 caractere, o majusculă, cifră și caracter special";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleRegister = async () => {
        if (!validate()) return;

        setIsLoading(true);
        setErrors({});

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, phone, password }),
            });

            const data = await response.json();

            if (response.ok) {
                if (Platform.OS === "web") {
                    alert("Contul a fost creat cu succes!");
                    navigation.navigate("Login");
                } else {
                    Alert.alert("Succes!", "Contul a fost creat cu succes.", [
                        { text: "OK", onPress: () => navigation.navigate("Login") },
                    ]);
                }
            } else {
                setErrors({
                    general: data.detail || "Înregistrarea a eșuat. Încearcă din nou.",
                });
            }
        } catch (error) {
            console.error(error);
            setErrors({
                general:
                    "Eroare de conexiune la server. Verifică dacă backend-ul este pornit.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <LinearGradient
                colors={["#EEF2FF", "#FFF7ED", "#ffffff"]}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Top blob decorativ */}
                    <View style={styles.topBlob} />
                    
                    {/* Logo - un pic mai sus ca la login pentru a face loc formularului mai lung */}
                    <Image
                        source={require("../../assets/StuddAIaf.svg")}
                        style={styles.logo}
                        contentFit="contain"
                    />

                    {/* Card principal */}
                    <View style={styles.card}>
                        <Text style={styles.title}>Creare cont</Text>
                        <Text style={styles.subtitle}>
                            Alătură-te platformei noastre
                        </Text>

                        {/* Eroare generală */}
                        {errors.general && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>⚠️ {errors.general}</Text>
                            </View>
                        )}

                        <CustomInput
                            placeholder="Nume utilizator"
                            value={username}
                            setValue={setUsername}
                            type="account"
                        />
                        {errors.username && (
                            <Text style={styles.fieldError}>{errors.username}</Text>
                        )}

                        <CustomInput
                            placeholder="Email"
                            value={email}
                            setValue={setEmail}
                            type="email"
                        />
                        {errors.email && (
                            <Text style={styles.fieldError}>{errors.email}</Text>
                        )}

                        <CustomInput
                            placeholder="Telefon"
                            value={phone}
                            setValue={setPhone}
                            type="phone"
                            isNumeric={true}
                        />
                        {errors.phone && (
                            <Text style={styles.fieldError}>{errors.phone}</Text>
                        )}

                        <CustomInput
                            placeholder="Parolă"
                            value={password}
                            setValue={setPassword}
                            type="lock"
                            secureTextEntry={!showPassword}
                            onToggleShowPassword={() => setShowPassword(!showPassword)}
                        />
                        {errors.password && (
                            <Text style={styles.fieldError}>{errors.password}</Text>
                        )}

                        <TouchableOpacity
                            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
                            onPress={handleRegister}
                            activeOpacity={0.85}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={[COLORS.mainblue, "#3B5FD4"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.registerButtonGradient}
                            >
                                <Text style={styles.registerButtonText}>
                                    {isLoading ? "Se procesează..." : "Înregistrare"}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>Ai deja cont? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                                <Text style={styles.loginLink}>Conectează-te</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        alignItems: "center",
        paddingBottom: 40,
    },
    // Blob decorativ în spate
    topBlob: {
        position: "absolute",
        top: -80,
        right: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: COLORS.mainblue,
        opacity: 0.07,
    },
    logo: {
        width: 200, 
        height: 200,
        marginTop: height * 0.06, // Puțin mai sus față de login pentru a face loc câmpurilor
        marginBottom: 10,
    },
    // Card
    card: {
        width: "90%",
        backgroundColor: "#fff",
        borderRadius: 28,
        padding: 28,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
    },
    title: {
        fontSize: 26,
        fontWeight: "800",
        color: COLORS.orange,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.mainblue,
        marginBottom: 24,
    },
    // Error general
    errorBox: {
        backgroundColor: "#FFF0F0",
        borderLeftWidth: 4,
        borderLeftColor: "#FF4D4D",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    errorText: {
        color: "#CC0000",
        fontSize: 13,
    },
    fieldError: {
        color: "#CC0000",
        fontSize: 12,
        marginTop: 4,
        marginBottom: 8,
        marginLeft: 2,
    },
    // Buton register
    registerButton: {
        borderRadius: 14,
        overflow: "hidden",
        marginTop: 14,
        marginBottom: 20,
        shadowColor: COLORS.mainblue,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    registerButtonDisabled: {
        opacity: 0.7,
    },
    registerButtonGradient: {
        paddingVertical: 16,
        alignItems: "center",
        borderRadius: 14,
    },
    registerButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },
    // Login link bottom
    loginContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    loginText: {
        color: "#888",
        fontSize: 14,
    },
    loginLink: {
        color: COLORS.orange,
        fontSize: 14,
        fontWeight: "700",
    },
});