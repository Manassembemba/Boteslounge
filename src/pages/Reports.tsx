import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";

interface SaleData {
  date: string;
  total: number;
  profit: number;
  count: number;
}

const Reports = () => {
  const [salesData, setSalesData] = useState<SaleData[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    // Load last 7 days sales
    const sevenDaysAgo = subDays(new Date(), 7);
    
    const { data: sales } = await supabase
      .from("sales")
      .select("total, profit, created_at")
      .gte("created_at", sevenDaysAgo.toISOString());

    // Group by date
    const grouped = (sales || []).reduce((acc: any, sale) => {
      const date = format(new Date(sale.created_at), "yyyy-MM-dd");
      if (!acc[date]) {
        acc[date] = { date, total: 0, profit: 0, count: 0 };
      }
      acc[date].total += Number(sale.total);
      acc[date].profit += Number(sale.profit);
      acc[date].count += 1;
      return acc;
    }, {});

    setSalesData(Object.values(grouped));

    // Load top products
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("quantity, product_id, products(name)")
      .gte("created_at", sevenDaysAgo.toISOString());

    const productSales = (saleItems || []).reduce((acc: any, item: any) => {
      const name = item.products?.name || "Unknown";
      if (!acc[name]) {
        acc[name] = 0;
      }
      acc[name] += item.quantity;
      return acc;
    }, {});

    const top = Object.entries(productSales)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 5);

    setTopProducts(top);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rapports</h1>
          <p className="text-muted-foreground">Analyses et statistiques</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sales by day */}
          <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Ventes des 7 derniers jours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {salesData.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Aucune vente</p>
                ) : (
                  salesData.map((day) => (
                    <div key={day.date} className="flex items-center justify-between border-b border-border pb-2">
                      <div>
                        <p className="font-medium">
                          {format(new Date(day.date), "d MMMM", { locale: fr })}
                        </p>
                        <p className="text-xs text-muted-foreground">{day.count} vente(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{day.total.toFixed(2)} FC</p>
                        {isAdmin && (
                          <p className="text-xs text-success">+{day.profit.toFixed(2)} FC</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top products */}
          <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Top 5 produits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topProducts.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Aucune donnée</p>
                ) : (
                  topProducts.map((product, index) => (
                    <div key={product.name} className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {index + 1}
                        </span>
                        <span className="font-medium">{product.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{product.quantity} vendus</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;
