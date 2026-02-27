import React from "react";
import * as Font from 'expo-font';
import { COLORS, FONT } from "./constants/theme";
import { StatusBar, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "./src/pages/Login"
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
        <View style={s.root}>
            <StatusBar barStyle="dark-content"/>
            <NavigationContainer>
                <Stack.Navigator
                    initialRouteName="Login"
                    screenOptions={{
                        headerShown: false,
                        animation: "slide_from_right",
                        cardStyle: { backgroundColor: COLORS.yellow},
                        flex: 1
                    }}
                >
                    <Stack.Screen name="Login" component={Login} />
                </Stack.Navigator>
            </NavigationContainer>
        </View>
    );
}
