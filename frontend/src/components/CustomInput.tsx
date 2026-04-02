import React from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme"; // Asigură-te că drumul e corect
import s from "../../styles"; 

interface CustomInputProps {
    value: string;
    setValue: (text: string) => void;
    placeholder: string;
    type: keyof typeof MaterialCommunityIcons.glyphMap;
    secureTextEntry?: boolean;
    onToggleShowPassword?: () => void;
    isSmall?: boolean;
    isNumeric?: boolean;
}

const CustomInput: React.FC<CustomInputProps> = ({
    value,
    setValue,
    placeholder,
    type,
    secureTextEntry,
    onToggleShowPassword,
    isSmall = false,
    isNumeric = false,
}) => {

    // Funcție pentru tratarea numerelor (înlocuiește virgula cu punctul)
    // const handleChangeText = (text: string) => {
    //     if (isNumeric) {
    //         setValue(text.replace(',', '.'));
    //     } else {
    //         setValue(text);
    //     }
    // };

    
    // verificăm dacă am trimis funcția onToggleShowPassword
    const isPasswordField = placeholder.toLowerCase().includes('parola') || placeholder.toLowerCase().includes('parolă');

    return (
        
            <View style={[s.input_container]}>
                {/* Iconița din stânga */}
                <MaterialCommunityIcons name={type} size={24} color={COLORS.mainblue} style={s.icons_input} />
                <TextInput
                    value={value}
                    onChangeText={setValue}
                    style={s.input_text}
                    placeholder={placeholder}
                    placeholderTextColor="#999"
                    secureTextEntry={secureTextEntry}
                    maxLength={isSmall ? 15 : undefined}
                    keyboardType={isNumeric ? 'numeric' : 'default'}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            
                {isPasswordField && (
                        <MaterialCommunityIcons
                            name={secureTextEntry ? 'eye-off' : 'eye'}
                            size={24}
                            color={COLORS.mainblue}
                            style={s.eye_icon}
                            onPress={onToggleShowPassword}
                        />
                )}
            </View>
    );
};

export default CustomInput;

