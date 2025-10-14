import { ReactNode, useContext, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Package, ShoppingCart, BarChart3, LogOut, Users, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthContext } from "@/App";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading } = useContext(AuthContext);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Déconnexion réussie",
      description: "À bientôt!",
    });
    navigate("/auth");
  };

  const allNavItems = [
    { path: "/dashboard", icon: Home, label: "Tableau de bord", roles: ["admin", "manager", "cashier"] },
    { path: "/products", icon: Package, label: "Produits", roles: ["admin", "manager"] },
    { path: "/pos", icon: ShoppingCart, label: "Caisse", roles: ["admin", "manager", "cashier"] },
    { path: "/reports", icon: BarChart3, label: "Rapports", roles: ["admin", "manager"] },
    { path: "/history", icon: History, label: "Historique", roles: ["admin", "manager", "cashier"] },
    { path: "/users", icon: Users, label: "Utilisateurs", roles: ["admin"] },
  ];

  const isMobile = useIsMobile();

  const navItems = useMemo(() => {
    if (!role) return [];
    return allNavItems.filter(item => item.roles.includes(role));
  }, [role]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Botes Lounge Logo" className="h-8 w-8" />
            <span className="text-xl font-bold text-primary">Botes Lounge</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <Link to={item.path}>
                    <SidebarMenuButton variant={isActive ? "default" : "ghost"}>
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Déconnexion</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b bg-card/50 px-4 backdrop-blur-sm">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-4">
                { !loading && user?.user_metadata?.full_name && (
                    <p className="text-sm text-muted-foreground">
                        {new Date().getHours() < 18 ? "Bonjour" : "Bonsoir"}, {user.user_metadata.full_name}
                    </p>
                )}
            </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
