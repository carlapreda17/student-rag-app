import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import s from "../../styles";
import * as Font from 'expo-font';
import { COLORS, FONT } from "../../constants/theme";
import { useAuth } from "../components/AuthContext";
const API_URL = process.env.EXPO_PUBLIC_API_URL;


interface LoginErrors{
    email?: string;
    password?: string;
    general?: string;
} 

export default function Login({ navigation }: any) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<LoginErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();


    const handleLogin = async() => {
        console.log("Login pressed", { email, password });
        setErrors({});
        let isValid = true;
        let newErrors: LoginErrors = {};

        if (!email.trim()) {
            newErrors.email = "Te rugăm să introduci email-ul.";
            isValid = false;
        }
        if (!password) {
            newErrors.password = "Te rugăm să introduci parola.";
            isValid = false;
        }

        if (!isValid) {
            setErrors(newErrors);
            return; 
        }

        setIsLoading(true);
        try {
           
            // 4. Facem cererea POST către FastAPI
            console.log({API_URL});
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                }),
            });

            const data = await response.json();
           

            if (response.ok) {
                console.log("Autentificare reușită:", data.user);
                await login(data.user);
                navigation.navigate("HomePage");
            } else {
                setErrors({ general: data.detail || "Email sau parolă incorectă." });
            }
        } catch (error) {
            console.error("Eroare de rețea:", error);
            setErrors({ general: "Nu ne-am putut conecta la server. Verifică conexiunea la internet." });
        } finally {
            setIsLoading(false);
        }

    };

    const handleRegister = () => {
        navigation.navigate("Register");
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.container}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Bun venit!</Text>
                            <Text style={styles.subtitle}>Conectează-te la contul tău</Text>
                        </View>

                        {errors.general && (
                            <View style={styles.errorBox}>
                                <Text style={styles.generalErrorText}>{errors.general}</Text>
                            </View>
                        )}

                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={[styles.input, errors.email && styles.inputError]}
                                    placeholder="exemplu@email.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Parolă</Text>
                                <TextInput
                                    style={[styles.input, errors.password && styles.inputError]}
                                    placeholder="Introdu parola"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoCorrect={false}

                                />
                                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                            </View>

                            <TouchableOpacity style={styles.forgotPassword}>
                                <Text style={styles.forgotPasswordText}>Ai uitat parola?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.loginButton}
                                onPress={handleLogin}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.loginButtonText}>Conectare</Text>
                            </TouchableOpacity>

                            <View style={styles.signupContainer}>
                                <Text style={styles.signupText}>Nu ai cont? </Text>
                                <TouchableOpacity onPress={handleRegister}>
                                    <Text style={styles.signupLink}>Înregistrează-te</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    keyboardView: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
    },
    container: {
        width: "100%",
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#1a1a1a",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
    },
    form: {
        width: "100%",
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: "#333",
    },
    inputError: {
        borderColor: "#ff4444",
    },
    forgotPassword: {
        alignSelf: "flex-end",
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: COLORS.mainblue,
        fontSize: 14,
        fontWeight: "600",
    },
    loginButton: {
        backgroundColor: COLORS.mainblue,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        marginBottom: 20,
        shadowColor: COLORS.mainblue,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    loginButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    signupContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    signupText: {
        color: "#666",
        fontSize: 14,
    },
    signupLink: {
        color: COLORS.mainblue,
        fontSize: 14,
        fontWeight: "600",
    },
    inputErrorBorder: {
        borderColor: "#ff4444",
        borderWidth: 1.5,
    },
    errorText: {
        color: "#ff4444",
        fontSize: 12,
        marginTop: 4,
        alignSelf: 'flex-start'
    },
    errorBox: {
        backgroundColor: "#ffebee",
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderColor: "#ff4444"
    },
    generalErrorText: {
        color: "#c62828",
        fontSize: 14,
        fontWeight: "500",
    },
});