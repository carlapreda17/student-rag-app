import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme";
import ScreenWrapper from "../components/ScreenWrapper";

export default function HistoryDetail({ route, navigation }: any) {
  // Preluăm datele trimise din Chat.tsx
  const { question, answer, date } = route.params;
  const formattedDate = new Date(date).toLocaleString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <ScreenWrapper>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Detaliu Conversație</Text>
          <Text style={styles.headerSubtitle}>{formattedDate}</Text>
        </View>
      </View>

      {/* ── Conținut Chat ── */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bula Utilizator (Întrebarea) */}
        <View style={styles.bubbleRowUser}>
          <View style={styles.bubbleUser}>
            <Text style={styles.bubbleTextUser}>{question}</Text>
          </View>
        </View>

        {/* Bula Asistent (Răspunsul) */}
        <View style={styles.bubbleRowAssistant}>
          <View style={styles.assistantAvatar}>
            <Ionicons name="sparkles" size={14} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.bubbleAssistant}>
              <Text style={styles.bubbleTextAssistant}>{answer}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.mainblue,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
    zIndex: 20,
  },
  backBtn: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 40,
  },
  /* Stiluri Bule (La fel ca in Chat) */
  bubbleRowUser: {
    alignSelf: "flex-end",
    marginBottom: 20,
    maxWidth: "85%",
  },
  bubbleUser: {
    backgroundColor: COLORS.mainblue,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleTextUser: {
    fontSize: 15,
    lineHeight: 22,
    color: "#fff",
  },
  bubbleRowAssistant: {
    flexDirection: "row",
    alignSelf: "flex-start",
    gap: 8,
    maxWidth: "85%",
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.mainblue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  bubbleAssistant: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ece9ff",
    shadowColor: "#6366f1",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bubbleTextAssistant: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1a1a2e",
  },
});