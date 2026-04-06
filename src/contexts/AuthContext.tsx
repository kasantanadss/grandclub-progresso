import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type LocalUser = {
  id: string;
  email: string;
};

type StoredAccount = {
  id: string;
  email: string;
  password: string;
};

interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const ACCOUNTS_STORAGE_KEY = 'grand-club-local-auth-accounts';
const SESSION_STORAGE_KEY = 'grand-club-local-auth-session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readAccounts() {
  const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
  if (!raw) return [] as StoredAccount[];

  try {
    const parsed = JSON.parse(raw) as StoredAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

function readSession() {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LocalUser;
  } catch {
    return null;
  }
}

function writeSession(user: LocalUser | null) {
  if (!user) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readSession());
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      signIn: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const account = readAccounts().find((item) => item.email === normalizedEmail);

        if (!account || account.password !== password) {
          return { error: new Error('E-mail ou senha inválidos.') };
        }

        const nextUser = { id: account.id, email: account.email };
        setUser(nextUser);
        writeSession(nextUser);
        return { error: null };
      },
      signUp: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const accounts = readAccounts();

        if (accounts.some((item) => item.email === normalizedEmail)) {
          return { error: new Error('Já existe uma conta com esse e-mail neste navegador.') };
        }

        const account: StoredAccount = {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          password,
        };

        writeAccounts([...accounts, account]);
        const nextUser = { id: account.id, email: account.email };
        setUser(nextUser);
        writeSession(nextUser);
        return { error: null };
      },
      signOut: async () => {
        setUser(null);
        writeSession(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
