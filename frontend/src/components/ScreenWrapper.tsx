// src/components/ScreenWrapper.tsx
import { SafeAreaView, View } from "react-native";
import { COLORS } from "../../constants/theme";

export default function ScreenWrapper({ children, headerColor = COLORS.mainblue }: any) {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: headerColor }}>
            <View style={{ flex: 1, backgroundColor: "#f8f7ff" }}>
                {children}
            </View>
        </SafeAreaView>
    );
}
