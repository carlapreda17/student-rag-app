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
    Dimensions
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import s from "../../styles";
import * as Font from 'expo-font';
import { COLORS, FONT } from "../../constants/theme";
import { useAuth } from "../components/AuthContext";
import CustomInput from "../components/CustomInput";
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { OAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../config/firebase";


const { height } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL;


interface LoginErrors{
    email?: string;
    password?: string;
    general?: string;
} 

export default function Login({ navigation }: any) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
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
                await login(data.user, data.token);
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

    const handleAppleLogin = async () => {
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            const { identityToken, fullName, email } = credential;
            if (!identityToken) return;

            setIsLoading(true);

            const response = await fetch(`${API_URL}/login/apple`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appleToken: identityToken,
                    firstName: fullName?.givenName || null,
                    lastName: fullName?.familyName || null,
                    appleEmail: email || null,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                await login(data.user, data.token);
                navigation.navigate("HomePage");
            } else {
                setErrors({
                    general: data.detail || "Autentificarea a eșuat.",
                });
            }
        } catch (e: any) {
            if (e.code === "ERR_REQUEST_CANCELED") {
                console.log("Utilizatorul a anulat.");
            } else {
                console.error("Eroare Apple Login:", e);
                setErrors({ general: "Eroare la autentificare." });
            }
        } finally {
            setIsLoading(false);
        }
    };
    const handleRegister = () => {
        navigation.navigate("Register");
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
                    {/* Logo */}
                        <Image
                            source={require("../../assets/StuddAIaf.svg")}
                            style={styles.logo}
                            contentFit="contain"
                        />
                   
                    {/* Card principal */}
                    <View style={styles.card}>
                        <Text style={styles.title}>Bun venit la StuddAI!</Text>
                        <Text style={styles.subtitle}>
                            Conectează-te pentru a continua
                        </Text>
                        {errors.general && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>⚠️ {errors.general}</Text>
                            </View>
                        )}
                    
                        <CustomInput
                            placeholder="Introdu email-ul"
                            value={email}
                            setValue={setEmail}
                            type="account"
                        />
                        {errors.email && (
                            <Text style={styles.fieldError}>{errors.email}</Text>
                        )}
                       
                      
                        <CustomInput
                            placeholder="Introdu parola"
                            value={password}
                            setValue={setPassword}
                            type="lock"
                            secureTextEntry={!showPassword}
                            onToggleShowPassword={() => setShowPassword(!showPassword)}
                        />
                        {errors.password && (
                                <Text style={styles.fieldError}>{errors.password}</Text>
                        )}
                        
                        <TouchableOpacity style={styles.forgotPassword}>
                            <Text style={styles.forgotPasswordText}  onPress={() => navigation.navigate("ForgotPassword")}
                                >Ai uitat parola?
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            activeOpacity={0.85}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={[COLORS.mainblue, "#3B5FD4"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.loginButtonGradient}
                            >
                                <Text style={styles.loginButtonText}>
                                    {isLoading ? "Se conectează..." : "Conectare"}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>sau</Text>
                            <View style={styles.dividerLine} />
                        </View>
                        {/* --- BUTONUL DE APPLE RĂNDAT DOAR PE IOS --- */}
                        {Platform.OS === 'ios' && (
                            <AppleAuthentication.AppleAuthenticationButton
                                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                cornerRadius={14}
                                style={styles.appleButton}
                                onPress={handleAppleLogin}
                            />
                        )}
                        <View style={styles.signupContainer}>
                            <Text style={styles.signupText}>Nu ai cont? </Text>
                            <TouchableOpacity onPress={handleRegister}>
                                <Text style={styles.signupLink}>Înregistrează-te</Text>
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
        width: 250, // era 110, acum mai mare
        height: 250,
        marginTop: height * 0.1,
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
    // Input grup
    inputGroup: {
        marginBottom: 14,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#444",
        marginBottom: 6,
        marginLeft: 2,
    },
    fieldError: {
        color: "#CC0000",
        fontSize: 12,
        marginTop: 4,
        marginLeft: 2,
    },
    // Forgot
    forgotPassword: {
        alignSelf: "flex-end",
        marginBottom: 22,
        marginTop: 2,
    },
    forgotPasswordText: {
        color: COLORS.mainblue,
        fontSize: 13,
        fontWeight: "600",
    },
    // Buton login
    loginButton: {
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 20,
        shadowColor: COLORS.mainblue,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonGradient: {
        paddingVertical: 16,
        alignItems: "center",
        borderRadius: 14,
    },
    loginButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },
    // Divider
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#EBEBEB",
    },
    dividerText: {
        color: "#bbb",
        fontSize: 13,
        marginHorizontal: 12,
    },
    // Signup
    signupContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    signupText: {
        color: "#888",
        fontSize: 14,
    },
    signupLink: {
        color: COLORS.orange,
        fontSize: 14,
        fontWeight: "700",
    },

    appleButton: {
        width: '100%',
        height: 50,
        marginBottom: 20,
    },
});
