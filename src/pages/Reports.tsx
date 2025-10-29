import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { useTheme } from "next-themes";

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
  const { theme } = useTheme();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const sevenDaysAgo = subDays(new Date(), 7);
    
    const { data: sales } = await supabase
      .from("sales")
      .select("total, profit, created_at")
      .gte("created_at", sevenDaysAgo.toISOString());

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

    const sortedSales = Object.values(grouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setSalesData(sortedSales as SaleData[]);

    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("quantity, products(name)")
      .gte("created_at", sevenDaysAgo.toISOString());

    const productSales = (saleItems || []).reduce((acc: any, item: any) => {
      const name = item.products?.name || "Unknown";
      if (!acc[name]) {
        acc[name] = { name, value: 0 };
      }
      acc[name].value += item.quantity;
      return acc;
    }, {});

    const top = Object.values(productSales)
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 5);

    setTopProducts(top);
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rapports</h1>
          <p className="text-muted-foreground">Analyses et statistiques des 7 derniers jours</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>Ventes des 7 derniers jours</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              {salesData.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Aucune vente à afficher</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#333' : '#ccc'} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(str) => format(parseISO(str), "d MMM", { locale: fr })}
                      stroke={theme === 'dark' ? '#888' : '#333'}
                    />
                    <YAxis stroke={theme === 'dark' ? '#888' : '#333'} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#222' : '#fff',
                        borderColor: theme === 'dark' ? '#444' : '#ccc'
                      }}
                      labelFormatter={(label) => format(parseISO(label), "eeee d MMMM", { locale: fr })}
                      formatter={(value, name) => [
                        `${Number(value).toFixed(2)} FC`,
                        name === 'total' ? 'Ventes' : 'Bénéfice'
                      ]}
                    />
                    <Legend formatter={(value) => value === 'total' ? 'Ventes' : 'Bénéfice'} />
                    <Bar dataKey="total" fill="#3b82f6" name="Ventes" />
                    {isAdmin && <Bar dataKey="profit" fill="#10b981" name="Bénéfice" />}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>Top 5 produits</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              {topProducts.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Aucune donnée</p>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topProducts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {topProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} vendus`, name]}
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#222' : '#fff',
                        borderColor: theme === 'dark' ? '#444' : '#ccc'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;