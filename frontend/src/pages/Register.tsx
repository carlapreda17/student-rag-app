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
    Alert,
    ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/theme";
import s from "../../styles";

interface ValidationErrors {
    username?: string;
    email?: string;
    phone?: string;
    password?: string;
    general?: string; // Pentru erorile de la server
}

export default function Register({ navigation }: any) {
    // Stările care corespund cu modelul nostru din baza de date
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    const [errors, setErrors] = useState<ValidationErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    const validate = (): boolean => {
        let isValid = true;
        let newErrors: ValidationErrors = {};

        // Validare Username
        if (!username.trim()) {
            newErrors.username = 'Numele de utilizator este obligatoriu';
            isValid = false;
        } else if (!/^[a-zA-Z0-9]+([._]?[a-zA-Z0-9]+)*$/.test(username)) {
            newErrors.username = 'Format invalid (doar litere, cifre, . și _)';
            isValid = false;
        }

        // Validare Email
        if (!email.trim()) {
            newErrors.email = 'Email-ul este obligatoriu';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Adresa de email este invalidă';
            isValid = false;
        }

        // Validare Telefon
        if (!phone.trim()) {
            newErrors.phone = 'Telefonul este obligatoriu';
            isValid = false;
        } else if (!/^07\d{8}$/.test(phone)) {
            newErrors.phone = 'Format invalid (ex: 07xxxxxxxx, 10 cifre)';
            isValid = false;
        }

        // Validare Parolă
        if (!password) {
            newErrors.password = 'Parola este obligatorie';
            isValid = false;
        } else if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[A-Za-z\d!@#$%^&*()]{8,}$/.test(password)) {
            newErrors.password = 'Minim 8 caractere, o majusculă, cifră și caracter special';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

   const handleRegister = async () => {
        // Dacă validarea locală eșuează, ne oprim aici
        if (!validate()) {
            return;
        }

        setIsLoading(true);
        setErrors({}); // Curățăm erorile vechi înainte de a trimite

        try {
            const API_URL = 'http://192.168.1.132:8000'
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    phone: phone,
                    password: password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                    if (Platform.OS === 'web') {
                        alert("Contul a fost creat cu succes!"); // Alerta nativă a browserului
                        navigation.navigate("Login"); // Navigăm manual imediat după
                    }
                    else {
                        Alert.alert(
                        "Succes!",
                        "Contul a fost creat cu succes.",
                        [{ text: "OK", onPress: () => navigation.navigate("Login") }]
                        );
                }
            } else {
                // Eroare de la backend (ex: email deja folosit) o punem sub formular
                setErrors({ general: data.detail || "Înregistrarea a eșuat. Încearcă din nou." });
            }
        } catch (error) {
            console.error(error);
            setErrors({ general: "Eroare de conexiune la server. Verifică dacă backend-ul este pornit." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginNavigate = () => {
        // Navigăm înapoi la ecranul de login
        navigation.navigate("Login");
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
                            <Text style={styles.title}>Creare cont</Text>
                            <Text style={styles.subtitle}>Alătură-te platformei noastre de învățare</Text>
                        </View>

                        {errors.general && (
                            <View style={styles.errorBox}>
                                <Text style={styles.generalErrorText}>{errors.general}</Text>
                            </View>
                        )}

                        <View style={styles.form}>
                            {/* Câmp Username */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Nume utilizator</Text>
                                <TextInput
                                    style={[styles.input, errors.username && styles.inputErrorBorder]}
                                    placeholder="ex: popescu_ion"
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                            </View>

                            {/* Câmp Email */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={[styles.input, errors.email && styles.inputErrorBorder]}
                                    placeholder="exemplu@student.ro"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                            </View>

                            {/* Câmp phone */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Telefon</Text>
                                <TextInput
                                    style={[styles.input, errors.phone && styles.inputErrorBorder]}
                                    placeholder="ex: 0712345678"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                            </View>

                            {/* Câmp Parolă */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Parolă</Text>
                                <TextInput
                                    style={[styles.input, errors.password && styles.inputErrorBorder]}
                                    placeholder="Introdu parola"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                            </View>

                            <TouchableOpacity
                                style={styles.registerButton}
                                onPress={handleRegister}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.registerButtonText}>Înregistrare</Text>
                            </TouchableOpacity>

                            <View style={styles.loginContainer}>
                                <Text style={styles.loginText}>Ai deja cont? </Text>
                                <TouchableOpacity onPress={handleLoginNavigate}>
                                    <Text style={styles.loginLink}>Conectează-te</Text>
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
        marginBottom: 30,
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
        marginBottom: 16,
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
    registerButton: {
        backgroundColor: COLORS.mainblue,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        marginTop: 10,
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
    registerButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    loginContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    loginText: {
        color: "#666",
        fontSize: 14,
    },
    loginLink: {
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