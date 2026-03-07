import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    id: number;
    username: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (userData: User) => Promise<void>;
    logout: () => Promise<void>;
}

//Creăm Contextul gol
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Componenta care va "îmbrăca" aplicația
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true); 

    // La pornirea aplicației, verificăm dacă există un utilizator salvat în memorie
    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('userData');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error("Eroare la citirea sesiunii:", error);
            } finally {
                setIsLoading(false); 
            }
        };

        loadUser();
    }, []);

    // Funcția care se apelează din pagina de Login
    const login = async (userData: User) => {
        setUser(userData); // Setăm în memoria rapidă (stare)
        await AsyncStorage.setItem('userData', JSON.stringify(userData)); // Salvăm în memorie persistentă
    };

    // Funcția pentru butonul de Delogare
    const logout = async () => {
        setUser(null);
        await AsyncStorage.removeItem('userData');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

//Un Hook custom pentru a accesa contextul super ușor din orice fișier
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth trebuie folosit în interiorul unui AuthProvider');
    }
    return context;
};