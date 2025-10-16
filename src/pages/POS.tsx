import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, ShoppingCart, Trash2, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useContext } from "react";
import { AuthContext } from "@/App";
import QuantityDialog from "@/components/QuantityDialog";

interface Product {
  id: string;
  name: string;
  selling_price: number;
  purchase_price: number;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

const POS = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const { role, selectedSiteId } = useContext(AuthContext);

  useEffect(() => {
    loadProducts();
  }, [selectedSiteId]);

  const loadProducts = async () => {
    if (!selectedSiteId) return;

    console.log("Chargement des produits...");
    const { data, error } = await supabase
      .from("products")
      .select("id, name, selling_price, purchase_price, stock")
      .eq("is_active", true)
      .eq("site_id", selectedSiteId)
      .order("name");

    if (error) {
      console.error("Erreur lors du chargement des produits:", error);
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: "Impossible de charger les produits.",
      });
    }

    console.log("Produits reçus de Supabase:", data);
    setProducts(data || []);
  };

  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    if (product.stock < quantityToAdd) {
      toast({
        variant: "destructive",
        title: "Stock insuffisant",
        description: `Seulement ${product.stock} ${product.name} en stock.`, // Correction ici
      });
      return;
    }

    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      const newQuantity = existing.quantity + quantityToAdd;
      if (newQuantity > product.stock) {
        toast({
          variant: "destructive",
          title: "Stock insuffisant",
          description: `Quantité maximale atteinte (${product.stock} disponibles)`, // Correction ici
        });
        return;
      }
      setCart(cart.map((item) => 
        item.id === product.id 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: quantityToAdd }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + delta);
        if (newQuantity > item.stock) {
          toast({
            variant: "destructive",
            title: "Stock insuffisant",
          });
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter((item) => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  const profit = cart.reduce(
    (sum, item) => sum + (item.selling_price - item.purchase_price) * item.quantity,
    0
  );

  const handleCheckout = async () => {
    setIsCheckingOut(true);

    try {
      if (cart.length === 0) {
        toast({
          variant: "destructive",
          title: "Panier vide",
          description: "Ajoutez des produits avant de valider",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

          // Create sale
          const { data: sale, error: saleError } = await supabase
            .from("sales")
            .insert([{ cashier_id: user.id, total, profit, site_id: selectedSiteId }])
                  .select('*')
                  .single();      if (saleError || !sale) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible d'enregistrer la vente",
        });
        return;
      }

      // Create sale items
      const saleItems = cart.map((item) => ({
        sale_id: sale.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.selling_price,
        subtotal: item.selling_price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItems);

      if (itemsError) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible d'enregistrer les articles",
        });
        return;
      }

      // Update stock using the secure Edge Function
      const { error: functionError } = await supabase.functions.invoke('update-stock-on-sale', {
        body: { sale_id: sale.id },
      });

      if (functionError) {
        console.error("Edge function error:", functionError);
        toast({
          variant: "destructive",
          title: "Erreur critique de stock",
          description: "La vente a été enregistrée, mais le stock n'a pas pu être mis à jour. Contactez un admin.",
        });
      }

      // Create stock movements (still useful for history)
      for (const item of cart) {
        await supabase.from("stock_movements").insert([{
          product_id: item.id,
          user_id: user.id,
          type: "out",
          quantity: item.quantity,
          notes: `Vente #${sale.id.slice(0, 8)}`,
          site_id: selectedSiteId, // Ajout du site_id manquant
        }]);
      }

      toast({
        title: "Vente enregistrée",
        description: `Total: ${total.toFixed(2)} FC`,
      });

      setCart([]);
      loadProducts();
    } finally {
      setIsCheckingOut(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        {/* Cart - Prend 2/3 de l'espace */}
        <div className="w-2/3 space-y-4">
          <Card className="flex h-full flex-col border-border bg-card/50 shadow-card backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Panier
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-center text-sm text-muted-foreground">Panier vide</p>
                </div>
              ) : (
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 border-b border-border pb-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.selling_price} FC</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-7 w-7 ml-1" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Section de paiement toujours visible en bas */}
              <div className="mt-auto space-y-2 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total:</span>
                  <span className="font-medium">{total.toFixed(2)} FC</span>
                </div>
                {role === 'admin' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bénéfice:</span>
                    <span className="font-medium text-success">{profit.toFixed(2)} FC</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">{total.toFixed(2)} FC</span>
                </div>
                <Button onClick={handleCheckout} className="w-full" size="lg" disabled={cart.length === 0 || isCheckingOut}>
                  {isCheckingOut ? (
                    <span className="flex items-center gap-2">
                      <Loader className="h-4 w-4 animate-spin" />
                      Validation...
                    </span>
                  ) : (
                    "Valider la vente"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products selection - Prend 1/3 de l'espace */}
        <div className="flex w-1/3 flex-col gap-4">
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex-1 space-y-3 overflow-y-auto">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer border-border bg-card/50 shadow-card backdrop-blur-sm transition-all hover:shadow-glow"
                onClick={() => {
                  setSelectedProduct(product);
                  setQuantityDialogOpen(true);
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  <p className="text-lg font-bold text-primary">{product.selling_price} FC</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <QuantityDialog
        open={quantityDialogOpen}
        onOpenChange={setQuantityDialogOpen}
        product={selectedProduct}
        onAddToCart={(product, quantity) => {
          addToCart(product, quantity);
          setSelectedProduct(null);
        }}
      />
    </Layout>
  );
};

export default POS;
