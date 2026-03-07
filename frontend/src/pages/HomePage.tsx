import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../components/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function HomePage({navigation}: any) {
    const {user, logout} = useAuth();
   

    const handleLogout = async () => {
        await logout();
        navigation.navigate("Login");
    }
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.text}>Bun venit, {user?.username}!</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    text: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#1a1a1a",
    },
});