import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-gold animate-pulse" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/unidades" element={<UnitsPage />} />
        <Route path="/vagas" element={<SpotsPage />} />
        <Route path="/sorteio" element={<DrawPage />} />
        <Route path="/portaria" element={<PortariaPage />} />
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
