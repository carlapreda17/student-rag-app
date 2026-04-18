import React from "react";
import * as Font from 'expo-font';
import { COLORS, FONT } from "./constants/theme";
import { StatusBar, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "./src/pages/Login"
import Register from "./src/pages/Register"
import HomePage from "./src/pages/HomePage";
import Chat from "./src/pages/Chat";
import LibraryPage from "./src/pages/LibraryPage";
import Test from "./src/pages/Test";
import TakeTest from "./src/pages/TakeTest";
import ProgressPage from "./src/pages/ProgressPage";
import { AuthProvider } from "./src/components/AuthContext";
import s from "./styles"

const Stack = createNativeStackNavigator();

const loadFontsAsync = async () => {
    await Font.loadAsync({
        [FONT.regular]: require('./assets/fonts/Nunito/Nunito-Regular.ttf'),
        [FONT.bold]: require('./assets/fonts/Nunito/Nunito-Bold.ttf'),
        [FONT.medium]: require('./assets/fonts/Nunito/Nunito-Medium.ttf'),
    });
};
export default function App() {
    const [fontsLoaded, setFontsLoaded] = React.useState(false);
    React.useEffect(() => {
        loadFontsAsync().then(() => {
            setFontsLoaded(true);
        });
    }, []);

    return (
        <AuthProvider>
            <View style={s.root}>
                <StatusBar barStyle="dark-content"/>
                <NavigationContainer>
                    <Stack.Navigator
                        initialRouteName="Login"
                        screenOptions={{
                            headerShown: false,
                            animation: "slide_from_right",
                            contentStyle: { backgroundColor: COLORS.background, flex: 1 },
                           
                        }}
                    >
                        <Stack.Screen name="Login" component={Login} />
                        <Stack.Screen name="Register" component={Register} />
                        <Stack.Screen name="HomePage" component={HomePage} />
                        <Stack.Screen name="LibraryPage" component={LibraryPage} />
                        <Stack.Screen name="Chat" component={Chat} />
                        <Stack.Screen name="Test" component={Test} />
                        <Stack.Screen name="TakeTest" component={TakeTest} />
                        <Stack.Screen name="ProgressPage" component={ProgressPage} />
                    </Stack.Navigator>
                </NavigationContainer>
            </View>
        </AuthProvider>
    );
}
