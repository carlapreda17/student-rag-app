import { StyleSheet } from 'react-native';
import { COLORS, FONT, SIZES } from './constants/theme';

const styles = StyleSheet.create({
    //Asezare in pagina
    root: {
        flex: 1,
    },
    container: {
        alignItems: 'center',
        padding: 20,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
    },

    //Butoane
    text_btn_primary:{
        color:COLORS.background,
        fontFamily:FONT.bold,
        fontSize:SIZES.medium,

    },
    text_btn_link: {
        fontSize:SIZES.normal,
        color:COLORS.white,
        fontFamily:FONT.medium
    },
    text_btn_small_link: {
        fontSize:SIZES.small,
        textDecorationLine:'underline',
        color:COLORS.white,
        fontFamily:FONT.regular
    },
    placeholder: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: "#333",
    },

    //inputs
    input_text:{
        height:40,
        fontSize:SIZES.medium,
        fontFamily:FONT.regular,
        paddingLeft:40,
        width:'100%'
    },
    input_container:{
        backgroundColor:COLORS.white,
        width:'100%',
        borderColor:COLORS.lightGray,
        borderWidth:1,
        borderRadius:5,
        paddingHorizontal:10,
        flexDirection: 'row',      
        alignItems: 'center',
        marginVertical:10,
    },
    eye_icon:{
        position: 'absolute',
        right: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icons_input:{
        position: 'absolute',
        left: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    //Erori
    errorText: {
        color: COLORS.red,
        fontSize: SIZES.normal,
    },
    errorBox: {
        backgroundColor: "#ffebee",
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderColor: COLORS.brightRed,
        justifyContent: 'flex-start',
    },
     inputError: {
        borderColor: COLORS.red,
        borderWidth: 2
    },
});

export default styles;