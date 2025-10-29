import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Package, AlertTriangle, DollarSign, ShoppingCart } from "lucide-react";

type Product = {
  purchase_price: number;
};

type Sale = {
  created_at: string;
  site_id: string;
};

type SaleItemWithRelations = {
  subtotal: string | number;
  quantity: number;
  products: Product;
  sales: Sale;
};

type SaleItemsQueryResult = {
  subtotal: string | number;
  quantity: number;
  products: Product;
  sales: Sale;
};

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useContext } from "react";
import { AuthContext } from "@/App";
import CapitalTransactionDialog from "@/components/CapitalTransactionDialog";

interface DashboardStats {
  todaySales: number;
  todayProfit: number;
  todayItemsSold: number;
  lowStock: number;
  totalProducts: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayProfit: 0,
    todayItemsSold: 0,
    lowStock: 0,
    totalProducts: 0,
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [saleItemsHistory, setSaleItemsHistory] = useState<any[]>([]);
  const [totalCapital, setTotalCapital] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"investment" | "withdrawal">("investment");
  const { user, role, selectedSiteId, selectedSiteName } = useContext(AuthContext);

  interface ProductRelation {
    purchase_price?: number | null;
  }

  interface SalesRelation {
    created_at: string;
    site_id: string;
  }

  interface SaleItemWithRelations {
    subtotal: string;
    quantity: number;
    products: ProductRelation;
    sales: SalesRelation;
  }

  const fetchAllData = useCallback(async () => {
    if (!user || !selectedSiteId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Load today's sales for stats
    let allSaleItemsQuery = supabase
      .from("sale_items")
      .select(`
        subtotal,
        quantity,
        products(purchase_price),
        sales!inner(created_at, site_id)
      `)
      .gte("sales.created_at", todayISO)
      .eq("is_cancelled", false); // Filter out cancelled items

    if (selectedSiteId && selectedSiteId !== "all-sites") {
      allSaleItemsQuery = allSaleItemsQuery.eq("sales.site_id", selectedSiteId);
    } else if (role !== "admin" && selectedSiteId) {
      allSaleItemsQuery = allSaleItemsQuery.eq("sales.site_id", selectedSiteId);
    }

    const { data: allSaleItems } = await allSaleItemsQuery.returns<SaleItemsQueryResult[]>();

    const todaySales = allSaleItems?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0;
    const todayProfit = allSaleItems?.reduce((sum, item) => sum + (
      (Number(item.subtotal) || 0) - ((Number(item.products?.purchase_price) || 0) * (item.quantity || 0))
    ), 0) || 0;

    const todayItemsSold = allSaleItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    // Load products stats
    let productsQuery = supabase
      .from("products")
      .select("id, name, stock, alert_threshold");

    if (selectedSiteId && selectedSiteId !== "all-sites") {
      productsQuery = productsQuery.eq("site_id", selectedSiteId);
    } else if (role !== "admin" && siteId) {
      // If 'all-sites' is selected but user is not admin, restrict to their assigned site
      productsQuery = productsQuery.eq("site_id", siteId);
    }

    const { data: products } = await productsQuery;

    const lowStockProducts = products?.filter((p) => p.stock <= p.alert_threshold) || [];
    const lowStock = lowStockProducts.length;
    const totalProducts = products?.length || 0;

    // Load user's sale items history for today
    let userSalesQuery = supabase
      .from("sales")
      .select("id")
      .eq("cashier_id", user.id)
      .gte("created_at", todayISO);

    if (selectedSiteId && selectedSiteId !== "all-sites") {
      userSalesQuery = userSalesQuery.eq("site_id", selectedSiteId);
    } else if (role !== "admin" && siteId) {
      // If 'all-sites' is selected but user is not admin, restrict to their assigned site
      userSalesQuery = userSalesQuery.eq("site_id", siteId);
    }

    const { data: userSales } = await userSalesQuery;

    if (userSales && userSales.length > 0) {
      const { data: itemsHistoryData } = await supabase
        .from("sale_items")
        .select("id, quantity, subtotal, products(name), sales!inner(created_at)")
        .in("sale_id", userSales.map(s => s.id))
        .eq("is_cancelled", false) // Added filter
        .order("created_at", { foreignTable: "sales", ascending: false });
      setSaleItemsHistory(itemsHistoryData || []);
    } else {
      setSaleItemsHistory([]);
    }

    if (role === 'admin') {
      const { data: capitalData, error: capitalError } = await supabase.rpc('get_total_capital', { p_site_id: selectedSiteId === "all-sites" ? null : selectedSiteId });
      if (!capitalError) {
        setTotalCapital(capitalData);
      }

      const { data: profitData, error: profitError } = await supabase.rpc('get_total_sale_profit', { p_site_id: selectedSiteId === "all-sites" ? null : selectedSiteId });
      if (!profitError) {
        setTotalProfit(profitData);
      }

      let withdrawalsQuery = supabase
        .from("capital_transactions")
        .select("created_at, amount, description")
        .eq("type", "withdrawal")
        .order("created_at", { ascending: false })
        .limit(5);

      if (selectedSiteId && selectedSiteId !== "all-sites") {
        withdrawalsQuery = withdrawalsQuery.eq("site_id", selectedSiteId);
      }

      const { data: withdrawalsData, error: withdrawalsError } = await withdrawalsQuery;

      if (!withdrawalsError) {
        setRecentWithdrawals(withdrawalsData || []);
      }
    }

    setStats({ todaySales, todayProfit, todayItemsSold, lowStock, totalProducts });
    setAlerts(lowStockProducts.map(p => ({ id: p.id, message: `Stock faible pour ${p.name} (${p.stock} restants)` })));

  }, [user, selectedSiteId]);

  useEffect(() => {
    fetchAllData();

    const salesChannel = supabase
      .channel('custom-sales-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        () => fetchAllData()
      )
      .subscribe();

    const productsChannel = supabase
      .channel('custom-products-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        () => fetchAllData()
      )
      .subscribe();

    const saleItemsChannel = supabase // Added sale_items channel
      .channel('custom-sale-items-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sale_items' }, // Listen for updates on sale_items
        () => fetchAllData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(saleItemsChannel); // Added cleanup
    };
  }, [fetchAllData]);

  const statCards = [
    {
      title: "Ventes du jour",
      value: `${stats.todaySales.toFixed(2)} FC`,
      icon: DollarSign,
      color: "text-success",
      roles: ["admin", "manager", "cashier"],
    },
    {
      title: "Bénéfice du jour",
      value: `${stats.todayProfit.toFixed(2)} FC`,
      icon: TrendingUp,
      color: "text-primary",
      roles: ["admin"],
    },
    {
      title: "Capital ",
      value: `${(stats.todaySales - stats.todayProfit).toFixed(2)} FC`,
      icon: ShoppingCart,
      color: "text-blue-500",
      roles: ["admin"],
    },
    {
      title: "Capital Total",
      value: `${totalCapital.toFixed(2)} FC`,
      icon: DollarSign,
      color: "text-primary",
      roles: ["admin"],
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'overview de votre activité en temps réel</p>
        </div>

        {/* Section 1: Ventes, Bénéfice, Coût des ventes, Capital Total */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            if (role && !stat.roles.includes(role)) return null;
            
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border-border bg-card/50 shadow-card backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Section 2: Gestion du Capital (Actions) */}
        {role === "admin" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Gestion du Capital</h2>
            <div className="grid gap-4 lg:grid-cols-1">
              {/* Actions Card */}
              <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setTransactionType("withdrawal");
                      setDialogOpen(true);
                    }}
                  >
                    Faire un retrait
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Section 3: Alertes de stock & Historique des produits vendus */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Alerts */}
          {role && ['admin', 'manager'].includes(role) && alerts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Alertes de stock</h2>
              {alerts.map((alert) => (
                <Alert key={alert.id} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Stock faible</AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Sales History */}
          {role && saleItemsHistory.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Historique des produits vendus</h2>
              <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Heure</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead>Qté</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saleItemsHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{new Date(item.sales.created_at).toLocaleTimeString()}</TableCell>
                          <TableCell>{item.products.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="text-right font-medium">{Number(item.subtotal).toFixed(2)} FC</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Section 4: Derniers Retraits */}
        {role === "admin" && recentWithdrawals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Derniers Retraits</h2>
            <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentWithdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.created_at}>
                        <TableCell>{new Date(withdrawal.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-destructive font-medium">{withdrawal.amount.toFixed(2)} FC</TableCell>
                        <TableCell>{withdrawal.description || '--'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <CapitalTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchAllData}
        transactionType={transactionType}
        selectedSiteId={selectedSiteId}
      />
    </Layout>
  );

};

export default Dashboard;
