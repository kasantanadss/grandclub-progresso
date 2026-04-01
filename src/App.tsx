import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import UnitsPage from "@/pages/UnitsPage";
import SpotsPage from "@/pages/SpotsPage";
import DrawPage from "@/pages/DrawPage";
import LoginPage from "@/pages/LoginPage";
import PortariaPage from "@/pages/PortariaPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-gold animate-pulse" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4">
        <div>
          <p className="text-muted-foreground mb-2">Sua conta ainda não possui um perfil de acesso.</p>
          <p className="text-sm text-muted-foreground">Peça a um administrador para atribuir seu papel (admin ou portaria).</p>
          <button onClick={() => { import('@/integrations/supabase/client').then(m => m.supabase.auth.signOut()) }} className="mt-4 text-sm text-destructive underline">
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (role === 'portaria') {
    return (
      <AppLayout>
        <Routes>
          <Route path="/" element={<PortariaPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    );
  }

  // Admin
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/unidades" element={<UnitsPage />} />
        <Route path="/vagas" element={<SpotsPage />} />
        <Route path="/sorteio" element={<DrawPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
