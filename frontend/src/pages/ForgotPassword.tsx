import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { COLORS } from "../../constants/theme";
import CustomInput from "../components/CustomInput";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL;

type Step = "email" | "code" | "newPassword" | "success";

interface FormErrors {
    email?: string;
    code?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
}

export default function ForgotPassword({ navigation }: any) {
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    // ─── PAS 1: Trimite email cu cod ───
    const handleSendCode = async () => {
        setErrors({});
        if (!email.trim()) {
            setErrors({ email: "Te rugăm să introduci email-ul." });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setErrors({ email: "Adresa de email nu este validă." });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setStep("code");
            } else {
                setErrors({
                    general: data.detail || "Nu am putut trimite codul. Verifică email-ul.",
                });
            }
        } catch (error) {
            setErrors({
                general: "Nu ne-am putut conecta la server.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // ─── PAS 2: Verifică codul ───
    const handleVerifyCode = async () => {
        setErrors({});
        if (!code.trim()) {
            setErrors({ code: "Introdu codul primit pe email." });
            return;
        }
        if (code.length !== 6) {
            setErrors({ code: "Codul trebuie să aibă 6 cifre." });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/verify-reset-code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });

            const data = await response.json();

            if (response.ok) {
                setStep("newPassword");
            } else {
                setErrors({
                    general: data.detail || "Codul este invalid sau expirat.",
                });
            }
        } catch (error) {
            setErrors({ general: "Nu ne-am putut conecta la server." });
        } finally {
            setIsLoading(false);
        }
    };

    // ─── PAS 3: Setează parola nouă ───
    const handleResetPassword = async () => {
        setErrors({});
        let newErrors: FormErrors = {};
        let isValid = true;

        if (!password) {
            newErrors.password = "Introdu parola nouă.";
            isValid = false;
        } else if (password.length < 6) {
            newErrors.password = "Parola trebuie să aibă minim 6 caractere.";
            isValid = false;
        }
        if (!confirmPassword) {
            newErrors.confirmPassword = "Confirmă parola nouă.";
            isValid = false;
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = "Parolele nu coincid.";
            isValid = false;
        }

        if (!isValid) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code, new_password: password }),
            });

            const data = await response.json();

            if (response.ok) {
                setStep("success");
            } else {
                setErrors({
                    general: data.detail || "Nu am putut reseta parola.",
                });
            }
        } catch (error) {
            setErrors({ general: "Nu ne-am putut conecta la server." });
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Configurare per step ───
    const stepConfig = {
        email: {
            title: "Resetare parolă",
            subtitle: "Introdu email-ul pentru a primi un cod de verificare",
            icon: <MaterialCommunityIcons name="lock-reset" size={44} color={COLORS.mainblue} />,
        },
        code: {
            title: "Verificare cod",
            subtitle: `Am trimis un cod de 6 cifre la ${email}`,
            icon: <MaterialCommunityIcons name="email-check-outline" size={44} color={COLORS.mainblue} />,
        },
        newPassword: {
            title: "Parolă nouă",
            subtitle: "Alege o parolă nouă pentru contul tău",
            icon: <MaterialCommunityIcons name="key" size={44} color={COLORS.mainblue} />,
        },
        success: {
            title: "Parolă resetată!",
            subtitle: "Te poți conecta acum cu noua parolă",
            icon: <MaterialCommunityIcons name="check-circle" size={44} color={COLORS.green} />,
        },
    };

    const config = stepConfig[step];

    // ─── Stepper vizual ───
    const steps: Step[] = ["email", "code", "newPassword", "success"];
    const currentIndex = steps.indexOf(step);

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
                    {/* Blob decorativ */}
                    <View style={styles.topBlob} />

                    {/* Logo */}
                    <Image
                        source={require("../../assets/StuddAIaf.svg")}
                        style={styles.logo}
                        contentFit="contain"
                    />

                    {/* Card principal */}
                    <View style={styles.card}>
                        {/* Stepper */}
                        <View style={styles.stepperRow}>
                            {steps.map((s, i) => (
                                <React.Fragment key={s}>
                                    <View
                                        style={[
                                            styles.stepDot,
                                            i <= currentIndex && styles.stepDotActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.stepDotText,
                                                i <= currentIndex && styles.stepDotTextActive,
                                            ]}
                                        >
                                            {i < currentIndex ? "✓" : i + 1}
                                        </Text>
                                    </View>
                                    {i < steps.length - 1 && (
                                        <View
                                            style={[
                                                styles.stepLine,
                                                i < currentIndex && styles.stepLineActive,
                                            ]}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </View>

                        {/* Icon */}
                        <Text style={styles.stepIcon}>{config.icon}</Text>

                        {/* Titlu */}
                        <Text style={styles.title}>{config.title}</Text>
                        <Text style={styles.subtitle}>{config.subtitle}</Text>

                        {/* Eroare generală */}
                        {errors.general && (
                            <View style={styles.errorBox}>
                                 <MaterialCommunityIcons name="alert-circle" size={16} color={COLORS.red} />
                                <Text style={styles.errorText}>
                                     {errors.general}</Text>
                            </View>
                        )}

                        {/* ─── STEP: EMAIL ─── */}
                        {step === "email" && (
                            <>
                                <CustomInput
                                    placeholder="Introdu email-ul"
                                    value={email}
                                    setValue={setEmail}
                                    type="account"
                                />
                                {errors.email && (
                                    <Text style={styles.fieldError}>{errors.email}</Text>
                                )}

                                <TouchableOpacity
                                    style={[styles.mainButton, isLoading && styles.mainButtonDisabled]}
                                    onPress={handleSendCode}
                                    activeOpacity={0.85}
                                    disabled={isLoading}
                                >
                                    <LinearGradient
                                        colors={[COLORS.mainblue, "#3B5FD4"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.mainButtonGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.mainButtonText}>Trimite codul</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ─── STEP: COD ─── */}
                        {step === "code" && (
                            <>
                                <CustomInput
                                    placeholder="Introdu codul de 6 cifre"
                                    value={code}
                                    setValue={setCode}
                                    type="lock"
                                />
                                {errors.code && (
                                    <Text style={styles.fieldError}>{errors.code}</Text>
                                )}

                                <TouchableOpacity
                                    style={[styles.mainButton, isLoading && styles.mainButtonDisabled]}
                                    onPress={handleVerifyCode}
                                    activeOpacity={0.85}
                                    disabled={isLoading}
                                >
                                    <LinearGradient
                                        colors={[COLORS.mainblue, "#3B5FD4"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.mainButtonGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.mainButtonText}>Verifică codul</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.resendButton}
                                    onPress={handleSendCode}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.resendText}>
                                        Nu ai primit codul? Retrimite
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ─── STEP: PAROLĂ NOUĂ ─── */}
                        {step === "newPassword" && (
                            <>
                                <CustomInput
                                    placeholder="Parola nouă"
                                    value={password}
                                    setValue={setPassword}
                                    type="lock"
                                    secureTextEntry={!showPassword}
                                    onToggleShowPassword={() => setShowPassword(!showPassword)}
                                />
                                {errors.password && (
                                    <Text style={styles.fieldError}>{errors.password}</Text>
                                )}

                                <CustomInput
                                    placeholder="Confirmă parola nouă"
                                    value={confirmPassword}
                                    setValue={setConfirmPassword}
                                    type="lock"
                                    secureTextEntry={!showConfirmPassword}
                                    onToggleShowPassword={() =>
                                        setShowConfirmPassword(!showConfirmPassword)
                                    }
                                />
                                {errors.confirmPassword && (
                                    <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
                                )}

                                {/* Indicatori parolă */}
                                <View style={styles.strengthRow}>
                                    {[1, 2, 3, 4].map((level) => (
                                        <View
                                            key={level}
                                            style={[
                                                styles.strengthBar,
                                                {
                                                    backgroundColor:
                                                        password.length >= level * 3
                                                            ? password.length >= 10
                                                                ? "#22C55E"
                                                                : password.length >= 6
                                                                ? COLORS.orange
                                                                : "#EF4444"
                                                            : "#E5E7EB",
                                                },
                                            ]}
                                        />
                                    ))}
                                    <Text style={styles.strengthLabel}>
                                        {password.length === 0
                                            ? ""
                                            : password.length < 6
                                            ? "Slabă"
                                            : password.length < 10
                                            ? "Medie"
                                            : "Puternică"}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.mainButton, isLoading && styles.mainButtonDisabled]}
                                    onPress={handleResetPassword}
                                    activeOpacity={0.85}
                                    disabled={isLoading}
                                >
                                    <LinearGradient
                                        colors={[COLORS.mainblue, "#3B5FD4"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.mainButtonGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.mainButtonText}>
                                                Resetează parola
                                            </Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ─── STEP: SUCCES ─── */}
                        {step === "success" && (
                            <>
                                <View style={styles.successBox}>
                                    <Text style={styles.successEmoji}><MaterialCommunityIcons name="party-popper" size={80} color={COLORS.orange} /></Text>
                                    <Text style={styles.successText}>
                                        Parola a fost schimbată cu succes. Te poți autentifica acum.
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.mainButton}
                                    onPress={() => navigation.navigate("Login")}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={[COLORS.mainblue, "#3B5FD4"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.mainButtonGradient}
                                    >
                                        <Text style={styles.mainButtonText}>
                                            Mergi la Login
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Link înapoi */}
                        {step !== "success" && (
                            <View style={styles.backContainer}>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (step === "email") {
                                            navigation.goBack();
                                        } else if (step === "code") {
                                            setStep("email");
                                            setErrors({});
                                        } else if (step === "newPassword") {
                                            setStep("code");
                                            setErrors({});
                                        }
                                    }}
                                >
                                    <Text style={styles.backLink}>
                                        ← {step === "email" ? "Înapoi la Login" : "Pasul anterior"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
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
        marginTop: height * 0.08,
    },
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

    // Stepper
    stepperRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },
    stepDot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    stepDotActive: {
        backgroundColor: COLORS.mainblue + "15",
        borderColor: COLORS.mainblue,
    },
    stepDotText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#9CA3AF",
    },
    stepDotTextActive: {
        color: COLORS.mainblue,
    },
    stepLine: {
        width: 36,
        height: 2,
        backgroundColor: "#E5E7EB",
        marginHorizontal: 4,
    },
    stepLineActive: {
        backgroundColor: COLORS.mainblue,
    },

    // Icon
    stepIcon: {
        fontSize: 40,
        textAlign: "center",
        marginBottom: 12,
    },

    // Titlu
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: COLORS.orange,
        marginBottom: 6,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.mainblue,
        marginBottom: 24,
        textAlign: "center",
        lineHeight: 20,
    },

    // Erori
    errorBox: {
        backgroundColor: "#FFF0F0",
        borderLeftWidth: 4,
        borderLeftColor: "#FF4D4D",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    errorText: {
        color: "#CC0000",
        fontSize: 13,
    },
    fieldError: {
        color: "#CC0000",
        fontSize: 12,
        marginTop: 4,
        marginLeft: 2,
        marginBottom: 8,
    },

    // Buton principal
    mainButton: {
        borderRadius: 14,
        overflow: "hidden",
        marginTop: 20,
        marginBottom: 16,
        shadowColor: COLORS.mainblue,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    mainButtonDisabled: {
        opacity: 0.7,
    },
    mainButtonGradient: {
        paddingVertical: 16,
        alignItems: "center",
        borderRadius: 14,
    },
    mainButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },

    // Resend
    resendButton: {
        alignItems: "center",
        paddingVertical: 8,
    },
    resendText: {
        color: COLORS.mainblue,
        fontSize: 13,
        fontWeight: "600",
    },

    // Strength
    strengthRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 10,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 11,
        color: "#9CA3AF",
        fontWeight: "600",
        marginLeft: 8,
        minWidth: 60,
    },

    // Success
    successBox: {
        alignItems: "center",
        paddingVertical: 20,
    },
    successEmoji: {
        fontSize: 56,
        marginBottom: 16,
    },
    successText: {
        fontSize: 15,
        color: "#374151",
        textAlign: "center",
        lineHeight: 22,
    },

    // Back
    backContainer: {
        alignItems: "center",
        marginTop: 4,
    },
    backLink: {
        color: COLORS.mainblue,
        fontSize: 14,
        fontWeight: "600",
    },
});
