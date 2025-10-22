import { ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Package, ShoppingCart, BarChart3, LogOut, Users, History, Building } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { user, role, loading, siteId, siteName, selectedSiteId, selectedSiteName, setSelectedSiteId, setSelectedSiteName } = useContext(AuthContext);
  const [availableSites, setAvailableSites] = useState<any[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);

  useEffect(() => {
    const fetchSites = async () => {
      setSitesLoading(true);
      let sitesData: any[] = [];
      if (role === "admin") {
        const { data, error } = await supabase.from("sites").select("id, name").order("name");
        if (error) console.error("Error fetching all sites:", error);
        sitesData = data || [];
      } else if (siteId && siteName) {
        sitesData = [{ id: siteId, name: siteName }];
      }
      setAvailableSites(sitesData);
      setSitesLoading(false);
    };

    if (user) {
      fetchSites();
    }
  }, [user, role, siteId, siteName]);

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
    { path: "/stock", icon: Package, label: "Stock", roles: ["admin", "manager"] },
    { path: "/pos", icon: ShoppingCart, label: "Caisse", roles: ["admin", "manager", "cashier"] },
    { path: "/reports", icon: BarChart3, label: "Rapports", roles: ["admin", "manager"] },
    { path: "/history", icon: History, label: "Historique", roles: ["admin", "manager", "cashier"] },
    { path: "/users", icon: Users, label: "Utilisateurs", roles: ["admin"] },
    { path: "/sites", icon: Building, label: "Sites", roles: ["admin"] },
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
            {isMobile && <SidebarTrigger />}
            <div className="flex-1" />
            {(role === "admin" || role === "manager") && (
              <div className="mr-4">
                <Select
                  value={selectedSiteId || ""}
                  onValueChange={(value) => {
                    if (value === "all-sites") {
                      setSelectedSiteId("all-sites");
                      setSelectedSiteName("Tous les sites");
                    } else {
                      const selected = availableSites.find(s => s.id === value);
                      if (selected) {
                        setSelectedSiteId(selected.id);
                        setSelectedSiteName(selected.name);
                      }
                    }
                  }}
                  disabled={sitesLoading || availableSites.length === 0}
                >
                  <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sélectionner un site">
                    {selectedSiteId === "all-sites" ? "Tous les sites" : selectedSiteName || "Sélectionner un site"}
                  </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sitesLoading ? (
                      <SelectItem value="loading-sites" disabled>Chargement...</SelectItem>
                    ) : (
                      <>
                        {role === 'admin' && <SelectItem value="all-sites">Tous les sites</SelectItem>}
                        {availableSites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
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
