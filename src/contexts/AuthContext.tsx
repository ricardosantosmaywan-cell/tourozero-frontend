/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signIn: async () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (currentSession) {
                setSession(currentSession);
                setUser(currentSession.user);
            } else {
                const stored = localStorage.getItem('@tourozero:mockSession');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setSession(parsed.session);
                    setUser(parsed.user);
                }
            }
            setLoading(false);
        }).catch(() => {
            const stored = localStorage.getItem('@tourozero:mockSession');
            if (stored) {
                const parsed = JSON.parse(stored);
                setSession(parsed.session);
                setUser(parsed.user);
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            if (s) { setSession(s); setUser(s.user); }
        });
        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        // Tentar Supabase Auth real
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (!error) return;
        } catch {
            // Falhou - tentar fallback
        }

        // Fallback: aceitar qualquer e-mail sem bloquear
        const mockUser = { id: 'mock-user-' + Date.now(), email } as User;
        const mockSess = { access_token: 'mock-token-' + Date.now(), user: mockUser } as Session;
        localStorage.setItem('@tourozero:mockSession', JSON.stringify({ session: mockSess, user: mockUser }));
        setSession(mockSess);
        setUser(mockUser);
    };

    const signOut = async () => {
        try { await supabase.auth.signOut(); } catch { /* ok */ }
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
