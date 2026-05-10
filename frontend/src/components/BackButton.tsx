// src/components/BackButton.tsx
import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "../../constants/theme";


interface BackButtonProps {
    color?: string;
    onPress?: () => void;
}

export default function BackButton({ color = "#1a1a2e", onPress }: BackButtonProps) {
    const navigation = useNavigation();

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress || (() => navigation.goBack())}
            activeOpacity={0.8}
        >
            <Ionicons name="chevron-back" size={24} color={color} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.orange,
        alignItems: "center",
        justifyContent: "center",
    }
});