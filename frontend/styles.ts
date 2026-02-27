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
});

export default styles;