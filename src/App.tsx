import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import POS from "./pages/POS";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import History from "./pages/History";
import Sites from "./pages/Sites";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

import { useUserRole, UserRole } from "./hooks/useUserRole";
import { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  user: User | null;
  role: UserRole;
  loading: boolean;
  siteId: string | null;
  siteName: string | null;
  selectedSiteId: string | null;
  selectedSiteName: string | null;
  setSelectedSiteId: (id: string | null) => void;
  setSelectedSiteName: (name: string | null) => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  siteId: null,
  siteName: null,
  selectedSiteId: null,
  selectedSiteName: null,
});

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AppRoutes = () => {
  const { user, role, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Si le chargement est terminé, qu'on a un utilisateur mais pas de rôle, c'est un état invalide.
    if (!loading && user && !role) {
      toast({
        variant: "destructive",
        title: "Session invalide",
        description: "Votre utilisateur n'a pas de rôle assigné. Vous avez été déconnecté.",
      });
      supabase.auth.signOut();
      navigate("/auth");
    }
  }, [loading, user, role, navigate, toast]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <Routes>
        <Route
          path="/"
          element={
            user ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />
          }
        />
        <Route
          path="/auth"
          element={user ? <Navigate to="/dashboard" /> : <Auth />}
        />
        <Route
          path="/dashboard"
          element={!user ? <Navigate to="/auth" /> : <Dashboard />}
        />
        <Route
          path="/stock"
          element={!user ? <Navigate to="/auth" /> : <Products />}
        />
        <Route
          path="/pos"
          element={!user ? <Navigate to="/auth" /> : <POS />}
        />
        <Route
          path="/reports"
          element={!user ? <Navigate to="/auth" /> : <Reports />}
        />
        <Route
          path="/users"
          element={!user ? <Navigate to="/auth" /> : <Users />}
        />
        <Route
          path="/history"
          element={!user ? <Navigate to="/auth" /> : <History />}
        />
        <Route
          path="/sites"
          element={!user ? <Navigate to="/auth" /> : <Sites />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    
  );
};

const App = () => {
  const { user, role, loading, siteId, siteName } = useUserRole();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedSiteName, setSelectedSiteName] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (role === "admin" && selectedSiteId === null) {
        setSelectedSiteId("all-sites");
        setSelectedSiteName("Tous les sites");
      } else if (siteId && selectedSiteId === null) {
        setSelectedSiteId(siteId);
        setSelectedSiteName(siteName);
      }
    }
  }, [loading, role, siteId, siteName, selectedSiteId]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthContext.Provider value={{ user, role, loading, siteId, siteName, selectedSiteId, selectedSiteName, setSelectedSiteId, setSelectedSiteName }}>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
