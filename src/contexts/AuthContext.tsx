/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';


interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string) => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signIn: () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const mockSession = localStorage.getItem('@tourozero:mockSession');
        if (mockSession) {
            const parsed = JSON.parse(mockSession);
            setSession(parsed.session);
            setUser(parsed.user);
        }
        setLoading(false);
    }, []);

    const signIn = (email: string) => {
        const mockUser = { id: 'mock-user-123', email } as User;
        const mockSess = { access_token: 'mock-token', user: mockUser } as Session;

        localStorage.setItem('@tourozero:mockSession', JSON.stringify({ session: mockSess, user: mockUser }));
        setSession(mockSess);
        setUser(mockUser);
    };

    const signOut = async () => {
        localStorage.removeItem('@tourozero:mockSession');
        setSession(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
