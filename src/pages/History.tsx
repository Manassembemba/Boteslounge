import { useState, useEffect, useContext } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Search, FileDown } from "lucide-react";
import { format, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthContext } from "@/App";
import jsPDF from "jspdf";
import * as jspdfAutoTable from "jspdf-autotable";

const History = () => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sales, setSales] = useState<any[]>([]);
  const [totalSalesAmount, setTotalSalesAmount] = useState(0);
  const [totalProfitAmount, setTotalProfitAmount] = useState(0);
  const [totalCOGSAmount, setTotalCOGSAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { selectedSiteId } = useContext(AuthContext);

  const handleSearch = async () => {
    if (!dateFrom || !dateTo || !selectedSiteId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner une date de début, une date de fin et un site.",
      });
      return;
    }

    setLoading(true);
    const from = dateFrom.toISOString();
    const to = endOfDay(dateTo).toISOString();

    const { data, error } = await supabase
      .from("sale_items")
      .select(`
        quantity,
        unit_price,
        subtotal,
        sales!inner(
          created_at,
          profiles(email)
        ),
        products(name, purchase_price)
      `)
      .gte("sales.created_at", from)
      .lte("sales.created_at", to)
      .eq("sales.site_id", selectedSiteId)
      .order("created_at", { foreignTable: "sales", ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur de recherche",
        description: error.message,
      });
      setSales([]);
    } else {
      setSales(data || []);
      const total = (data || []).reduce((sum, item) => sum + Number(item.subtotal), 0);
      setTotalSalesAmount(total);
      const profit = (data || []).reduce((sum, item) => sum + (Number(item.unit_price) - Number(item.products.purchase_price)) * item.quantity, 0);
      setTotalProfitAmount(profit);
      const cogs = (data || []).reduce((sum, item) => sum + Number(item.products.purchase_price) * item.quantity, 0);
      setTotalCOGSAmount(cogs);
    }
    setLoading(false);
  };

  const handleExportPDF = () => {
    if (sales.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Il n'y a rien à exporter.",
      });
      return;
    }

    const doc = new jsPDF();
    const totalRevenue = sales.reduce((sum, item) => sum + item.subtotal, 0);

    // Title
    doc.setFontSize(20);
    doc.text("Rapport de Ventes - Botes Lounge", 14, 22);

    // Subtitle with date range
    doc.setFontSize(12);
    const dateRange = `Période du ${format(dateFrom!, "dd/MM/yyyy")} au ${format(dateTo!, "dd/MM/yyyy")}`;
    doc.text(dateRange, 14, 30);

    // Summary
    doc.setFontSize(12);
    doc.text(`Total des ventes: ${totalRevenue.toFixed(2)} FC`, 14, 40);
    doc.text(`Bénéfice total: ${totalProfitAmount.toFixed(2)} FC`, 14, 46);
    doc.text(`Coût d'achat total: ${totalCOGSAmount.toFixed(2)} FC`, 14, 52);
    doc.text(`Nombre de transactions: ${sales.length}`, 14, 58);

    // Table
    jspdfAutoTable.default(doc, {
      startY: 55,
      head: [["Date", "Produit", "Caissier", "Qté", "Prix Unit.", "Total"]],
      body: sales.map(item => [
        format(new Date(item.sales.created_at), "dd/MM/yy HH:mm"),
        item.products.name,
        item.sales.profiles.email,
        item.quantity,
        `${Number(item.unit_price).toFixed(2)} FC`,
        `${Number(item.subtotal).toFixed(2)} FC`,
      ]),
      foot: [['', '', '', '', 'Total Général:', `${totalRevenue.toFixed(2)} FC`]],
      footStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] }, // Green color
    });

    doc.save(`rapport_ventes_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Historique des Ventes</h1>
          <p className="text-muted-foreground">Consultez l'historique complet des ventes par date.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card/50 p-4 shadow-card backdrop-blur-sm">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "PPP") : <span>Date de début</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "PPP") : <span>Date de fin</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handleSearch} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            {loading ? "Recherche..." : "Rechercher"}
          </Button>

          <Button onClick={handleExportPDF} disabled={sales.length === 0} variant="secondary">
            <FileDown className="mr-2 h-4 w-4" />
            Exporter en PDF
          </Button>
        </div>

        {sales.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm">
              <CardContent className="flex items-center justify-between p-4">
                <h2 className="text-xl font-bold text-foreground">Total des ventes :</h2>
                <span className="text-2xl font-bold text-primary">{totalSalesAmount.toFixed(2)} FC</span>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm">
              <CardContent className="flex items-center justify-between p-4">
                <h2 className="text-xl font-bold text-foreground">Bénéfice Total :</h2>
                <span className="text-2xl font-bold text-success">{totalProfitAmount.toFixed(2)} FC</span>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm">
              <CardContent className="flex items-center justify-between p-4">
                <h2 className="text-xl font-bold text-foreground">Capital :</h2>
                <span className="text-2xl font-bold text-muted-foreground">{totalCOGSAmount.toFixed(2)} FC</span>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Caissier</TableHead>
                  <TableHead>Qté</TableHead>
                  <TableHead>Prix Unitaire</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Aucune vente à afficher pour cette période.
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{format(new Date(item.sales.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell>{item.products.name}</TableCell>
                      <TableCell>{item.sales.profiles.email}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{Number(item.unit_price).toFixed(2)} FC</TableCell>
                      <TableCell className="text-right">{Number(item.subtotal).toFixed(2)} FC</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default History;
