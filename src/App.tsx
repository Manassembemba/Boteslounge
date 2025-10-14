import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import POS from "./pages/POS";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

import { useUserRole, UserRole } from "./hooks/useUserRole";
import { User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

type AuthContextType = {
  user: User | null;
  role: UserRole;
  loading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

const AppRoutes = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
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
          path="/products"
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  const { user, role, loading } = useUserRole();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthContext.Provider value={{ user, role, loading }}>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
