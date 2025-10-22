import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProductDialog from "@/components/ProductDialog";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { useContext } from "react";
import { AuthContext } from "@/App";

interface Product {
  id: string;
  name: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  alert_threshold: number;
  is_active: boolean;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { selectedSiteId, siteId } = useContext(AuthContext);

  const loadProducts = useCallback(async () => {
    // If no site is selected (e.g., initial load for non-admin without assigned site), return early
    if (!selectedSiteId && !isAdmin) return;

    let query = supabase
      .from("products")
      .select("id, name, category, purchase_price, selling_price, stock, alert_threshold, is_active");

    if (selectedSiteId && selectedSiteId !== "all-sites") {
      query = query.eq("site_id", selectedSiteId);
    } else if (!isAdmin) {
      // If 'all-sites' is selected but user is not admin, restrict to their assigned site
      if (siteId) {
        query = query.eq("site_id", siteId);
      }
    }

    const { data, error } = await query.order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les produits",
      });
      return;
    }

    setProducts(data || []);
  }, [selectedSiteId, siteId, isAdmin, toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);



  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le produit",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Produit supprimé",
    });
    loadProducts();
  };

  const categoryLabels: Record<string, string> = {
    alcoholic: "Alcoolisé",
    non_alcoholic: "Non alcoolisé",
    cocktail: "Cocktail",
    snack: "Snack",
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Stock</h1>
            <p className="text-muted-foreground">Gérez l'état de votre stock</p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => {
                setSelectedProduct(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un article
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="border-border bg-card/50 shadow-card backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <Badge variant="outline" className="mt-2">
                      {categoryLabels[product.category]}
                    </Badge>
                  </div>
                  {product.stock <= product.alert_threshold && (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix d'achat:</span>
                    <span className="font-medium">{product.purchase_price} FC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix de vente:</span>
                    <span className="font-medium text-primary">{product.selling_price} FC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock:</span>
                    <span className={`font-bold ${product.stock <= product.alert_threshold ? "text-warning" : "text-success"}`}>
                      {product.stock}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedProduct(product);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        onSuccess={loadProducts}
      />
    </Layout>
  );
};

export default Products;
