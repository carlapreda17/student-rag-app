import { StyleSheet } from 'react-native';
import { COLORS, FONT } from './constants/theme';

const styles = StyleSheet.create({
    root: {
        backgroundColor: COLORS.background,
        flex: 1,
    },
    container: {
        alignItems: 'center',
        padding: 20,
    },
    placeholder: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: "#333",
    }
});

export default styles;