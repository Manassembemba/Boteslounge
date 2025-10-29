import { useState, useEffect, useContext } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Search, FileDown } from "lucide-react";
import { format, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole"; // Importer le hook
import { AuthContext } from "@/App";
import jsPDF from "jspdf";
import * as jspdfAutoTable from "jspdf-autotable";
import { useSearchParams } from "react-router-dom";
import { QueryFunctionContext, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SalesQueryVariables {
  from: string;
  to: string;
  selectedSiteId: string | null;
  userSiteId: string | null;
  isAdmin: boolean;
  isManager: boolean;
}

const getSalesData = async ({ queryKey }: QueryFunctionContext<[string, SalesQueryVariables]>) => {
  const [_key, { from, to, selectedSiteId, userSiteId, isAdmin, isManager }] = queryKey;

  let query = supabase
    .from("sale_items")
    .select(`
      id,
      product_id,
      quantity,
      unit_price,
      subtotal,
      sales!inner(
        created_at,
        profiles(full_name)
      ),
      products(name, purchase_price)
    `)
    .gte("sales.created_at", from)
    .lte("sales.created_at", to);

  if (selectedSiteId && selectedSiteId !== "all-sites") {
    query = query.eq("sales.site_id", selectedSiteId);
  } else if (!isAdmin && selectedSiteId === "all-sites") {
    if (userSiteId) {
      query = query.eq("sales.site_id", userSiteId);
    }
  }

  // Filter out cancelled sales
  query = query.eq('is_cancelled', false);
  console.log("getSalesData: Supabase query URL:", query.url);

  const { data, error } = await query.order("created_at", {
    foreignTable: "sales",
    ascending: false
  });

  if (error) {
    throw new Error(error.message || 'Erreur lors du chargement des ventes');
  }

  return data || [];
};

const History = () => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const { toast } = useToast();
  const { selectedSiteId, siteId } = useContext(AuthContext);
  const { isAdmin, isManager } = useUserRole(); // Obtenir les rôles
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine query parameters
  const queryEnabled = dateFrom !== undefined && dateTo !== undefined;
  const queryKey = [
    'sales',
    {
      from: dateFrom?.toISOString() || '',
      to: dateTo?.toISOString() || '',
      selectedSiteId,
      userSiteId: siteId,
      isAdmin,
      isManager,
    },
  ];

  const {
    data: sales = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: queryKey,
    queryFn: getSalesData,
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
    refetchOnWindowFocus: false, // Already globally disabled, but good to ensure
    refetchOnReconnect: false, // Already globally disabled, but good to ensure
  });

  useEffect(() => {
    if (isError && error) {
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: (error as Error).message,
      });
    }
  }, [isError, error, toast]);

  // Calculate totals from fetched sales data
  const totalSalesAmount = sales.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalProfitAmount = sales.reduce((sum, item) => sum + ((item.subtotal || 0) - ((item.products?.purchase_price || 0) * (item.quantity || 0))), 0);
  const totalCOGSAmount = sales.reduce((sum, item) => sum + ((item.products?.purchase_price || 0) * (item.quantity || 0)), 0);

  const loading = isLoading || isFetching; // Combined loading state

  const queryClient = useQueryClient(); // Added useQueryClient

  const cancelSaleMutation = useMutation({
    mutationFn: async ({ sale_item_id, product_id, quantity }: { sale_item_id: string, product_id: string, quantity: number }) => {
      const { data, error } = await supabase.functions.invoke('cancel-sale', {
        body: JSON.stringify({ sale_item_id, product_id, quantity }),
      });

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Vente annulée",
        description: "La vente a été annulée et le stock restauré.",
      });
      console.log("cancelSaleMutation: Invalidate queries for key 'sales'.");
      queryClient.invalidateQueries({ queryKey: ['sales'] }); // Invalidate sales query to refetch
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur lors de l'annulation",
        description: error.message || "Une erreur est survenue lors de l'annulation de la vente.",
      });
    },
  });

  const handleCancelSale = async (saleItemId: string, productId: string, quantity: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir annuler cette vente ? Cette action est irréversible.")) {
      cancelSaleMutation.mutate({ sale_item_id: saleItemId, product_id: productId, quantity });
    }
  };

  const handleExportPDF = async () => {
    if (sales.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Il n'y a rien à exporter.",
      });
      return;
    }

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text("Rapport de Ventes - Botes Lounge", 14, 22);

    // Subtitle with date range
    doc.setFontSize(12);
    const dateRange = `Période du ${format(dateFrom!, "dd/MM/yyyy")} au ${format(dateTo!, "dd/MM/yyyy")}`;
    doc.text(dateRange, 14, 30);
    
    // Summary
    doc.setFontSize(12);
    doc.text(`Total des ventes: ${totalSalesAmount.toFixed(2)} FC`, 14, 40);
    if (isAdmin || isManager) {
      doc.text(`Bénéfice total: ${totalProfitAmount.toFixed(2)} FC`, 14, 46);
      doc.text(`Coût d'achat total: ${totalCOGSAmount.toFixed(2)} FC`, 14, 52);
      doc.text(`Nombre de transactions: ${sales.length}`, 14, 58);
    } else {
      doc.text(`Nombre de transactions: ${sales.length}`, 14, 46);
    }

    // Table
    jspdfAutoTable.default(doc, {
      startY: (isAdmin || isManager) ? 65 : 55,
      head: [["Date", "Produit", "Caissier", "Qté", "Prix Unit.", "Total"]],
      body: sales.map(item => [
        format(new Date(item.sales.created_at), "dd/MM/yy HH:mm"),
        item.products.name,
        item.sales.profiles.full_name,
        item.quantity,
        `${Number(item.unit_price).toFixed(2)} FC`,
        `${Number(item.subtotal).toFixed(2)} FC`,
      ]),
      foot: [['', '', '', '', 'Total Général:', `${totalSalesAmount.toFixed(2)} FC`]],
      footStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] }, // Green color
    });

    // Save the PDF
    doc.save(`rapport_ventes_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  
  useEffect(() => {
    const loadDataAndSyncUrl = async () => {
      const urlFilter = searchParams.get('filter');
      const urlFrom = searchParams.get('from');
      const urlTo = searchParams.get('to');

      let currentFilter: string = 'today';
      let currentFrom: Date | undefined;
      let currentTo: Date | undefined;

      // 1. Determine current filter from URL or default
      if (urlFilter) {
        currentFilter = urlFilter;
      }

      // 2. Determine dates based on filter and URL
      if (urlFrom && urlTo) { // Always try to parse dates from URL if present
        const parsedFrom = new Date(urlFrom);
        const parsedTo = new Date(urlTo);
        if (!isNaN(parsedFrom.getTime()) && !isNaN(parsedTo.getTime())) {
          currentFrom = parsedFrom;
          currentTo = parsedTo;
        }
      }

      // 3. If dates are still not set for a non-custom filter, default to 'today'
      if ((!currentFrom || !currentTo) && currentFilter !== 'custom') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        currentFrom = todayStart;
        currentTo = todayEnd;
        currentFilter = 'today'; // Ensure filter is 'today' if defaulting dates
      }

      // 4. Set local React state
      setDateFrom(currentFrom);
      setDateTo(currentTo);
      setActiveFilter(currentFilter);

      // 5. Ensure URL reflects this determined state
      const newSearchParams: Record<string, string> = { filter: currentFilter };
      if (currentFrom && currentTo) {
        newSearchParams.from = currentFrom.toISOString();
        newSearchParams.to = currentTo.toISOString();
      }
      const currentUrlParams = new URLSearchParams(searchParams);
      const newUrlParams = new URLSearchParams(newSearchParams);

      if (currentUrlParams.toString() !== newUrlParams.toString()) {
        setSearchParams(newSearchParams, { replace: true });
      }

      // 6. Fetch data if dates are available
      // No need to call fetchSales directly here, useQuery handles it
    };

    loadDataAndSyncUrl();
  }, [searchParams, setSearchParams]);  // Fonction pour définir la période en fonction du filtre sélectionné
  const setDateRange = async (range: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setActiveFilter(range);

    let newFrom: Date | undefined;
    let newTo: Date | undefined;

    switch (range) {
      case 'today':
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        newFrom = todayStart;
        newTo = new Date();
        break;
      case 'yesterday':
        const yesterdayStart = new Date(today);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd = new Date(yesterdayStart);
        yesterdayEnd.setHours(23, 59, 59, 999);
        newFrom = yesterdayStart;
        newTo = yesterdayEnd;
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        newFrom = weekStart;
        newTo = new Date();
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        newFrom = monthStart;
        newTo = new Date();
        break;
      case 'custom':
        newFrom = undefined;
        newTo = undefined;
        break;
    }

    setDateFrom(newFrom);
    setDateTo(newTo);

    // Update URL parameters
    const currentSearchParams = new URLSearchParams(searchParams);
    currentSearchParams.set('filter', range);

    if (newFrom && newTo) {
      currentSearchParams.set('from', newFrom.toISOString());
      currentSearchParams.set('to', newTo.toISOString());
    } else if (range !== 'custom') { // If not custom, and dates are undefined, clear them
      currentSearchParams.delete('from');
      currentSearchParams.delete('to');
    }
    // If range is 'custom' and newFrom/newTo are undefined,
    // we don't touch 'from' and 'to' in currentSearchParams, preserving them if they exist.

    setSearchParams(currentSearchParams, { replace: true });

    // No need to call fetchSales directly here, useQuery handles it
  };


      const handleSearch = async () => {


        if (!dateFrom || !dateTo) {


          toast({


            title: "Erreur",


            description: "Veuillez sélectionner une date de début et une date de fin.",


            variant: "destructive"


          });


          return;


        }


    


        setActiveFilter('custom');


    


        // Update URL parameters


        setSearchParams({


          filter: 'custom',


          from: dateFrom.toISOString(),


          to: dateTo.toISOString(),


        });


    


        // No need to call fetchSales directly here, useQuery handles it


      };    return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Historique des Ventes</h1>
          <p className="text-muted-foreground">Consultez l'historique complet des ventes par date.</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Filtres rapides */}
          <Tabs 
            value={activeFilter} 
            onValueChange={(value) => setDateRange(value as any)}
            className="w-full"
          >
                        <TabsList className="grid w-full grid-cols-5">
                          <TabsTrigger value="today">
                            Aujourd'hui
                          </TabsTrigger>
                          <TabsTrigger value="yesterday">
                            Hier
                          </TabsTrigger>
                          <TabsTrigger value="week">
                            Cette semaine
                          </TabsTrigger>
                          <TabsTrigger value="month">
                            Ce mois
                          </TabsTrigger>
                          <TabsTrigger
                            value="custom"
                            className={activeFilter === 'custom' ? 'bg-primary text-primary-foreground' : ''}
                          >
                            Personnalisé
                          </TabsTrigger>
                        </TabsList>          </Tabs>

                    {/* Sélecteurs de date (affichés uniquement pour le filtre personnalisé) */}

                    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card/50 p-4 shadow-card backdrop-blur-sm">

                    {activeFilter === 'custom' && (

                      <>

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

                                                onSelect={(date) => setDateTo(date ? endOfDay(date) : undefined)}

                                                initialFocus

                                              />

                          </PopoverContent>

                        </Popover>

          

                        

                      </>

                    )}

                    <Button onClick={handleExportPDF} disabled={sales.length === 0 || totalSalesAmount === 0} variant="secondary">

                      <FileDown className="mr-2 h-4 w-4" />

                      Exporter en PDF

                    </Button>

                    </div>
        </div>

        {sales.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border bg-card/50 shadow-card backdrop-blur-sm">
              <CardContent className="flex items-center justify-between p-4">
                <h2 className="text-xl font-bold text-foreground">Total des ventes :</h2>
                <span className="text-2xl font-bold text-primary">{totalSalesAmount.toFixed(2)} FC</span>
              </CardContent>
            </Card>

            {(isAdmin || isManager) && (
              <>
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
              </>
            )}
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
                  {(isAdmin || isManager) && <TableHead className="text-center">Actions</TableHead>}
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
                      <TableCell>{item.sales.profiles.full_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{Number(item.unit_price).toFixed(2)} FC</TableCell>
                      <TableCell className="text-right">{Number(item.subtotal).toFixed(2)} FC</TableCell>
                      {(isAdmin || isManager) && (
                        <TableCell className="text-center">
                          <Button variant="destructive" size="sm" onClick={() => handleCancelSale(item.id, item.product_id, item.quantity)}>
                            Annuler
                          </Button>
                        </TableCell>
                      )}
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
