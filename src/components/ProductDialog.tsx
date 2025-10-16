import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onSuccess: () => void;
}

const ProductDialog = ({ open, onOpenChange, product, onSuccess }: ProductDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);

  useEffect(() => {
    const fetchSites = async () => {
      setSitesLoading(true);
      const { data, error } = await supabase.from("sites").select("id, name").order("name");
      if (error) {
        console.error("Error fetching sites:", error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les sites.",
        });
      } else {
        setSites(data || []);
      }
      setSitesLoading(false);
    };

    if (open) {
      fetchSites();
    }
  }, [open]);
  const [formData, setFormData] = useState<{
    name: string;
    category: "alcoholic" | "non_alcoholic" | "cocktail" | "snack";
    purchase_price: string;
    selling_price: string;
    stock: string;
    alert_threshold: string;
  }>({
    name: "",
    category: "non_alcoholic",
    purchase_price: "",
    selling_price: "",
    stock: "",
    alert_threshold: "5",
    site_id: "", // Ajout du site_id
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        purchase_price: product.purchase_price.toString(),
        selling_price: product.selling_price.toString(),
        stock: product.stock.toString(),
        alert_threshold: product.alert_threshold.toString(),
        site_id: product.site_id, // Initialise avec le site du produit
      });
    } else {
      setFormData({
        name: "",
        category: "non_alcoholic",
        purchase_price: "",
        selling_price: "",
        stock: "",
        alert_threshold: "5",
        site_id: sites.length > 0 ? sites[0].id : "", // Sélectionne le premier site par défaut
      });
    }
  }, [product, open, sites]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      name: formData.name,
      category: formData.category,
      purchase_price: parseFloat(formData.purchase_price),
      selling_price: parseFloat(formData.selling_price),
      stock: parseInt(formData.stock),
      alert_threshold: parseInt(formData.alert_threshold),
      site_id: formData.site_id,
    };

    const { error } = product
      ? await supabase.from("products").update(data).eq("id", product.id)
      : await supabase.from("products").insert([data]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } else {
      toast({
        title: "Succès",
        description: product ? "Article modifié" : "Article ajouté",
      });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product ? "Modifier l'article" : "Ajouter un article"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as "alcoholic" | "non_alcoholic" | "cocktail" | "snack" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alcoholic">Alcoolisé</SelectItem>
                <SelectItem value="non_alcoholic">Non alcoolisé</SelectItem>
                <SelectItem value="cocktail">Cocktail</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Prix d'achat (FC)</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling_price">Prix de vente (FC)</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock initial</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
            </div>
                      <div className="space-y-2">
                        <Label htmlFor="alert_threshold">Seuil d'alerte</Label>
                        <Input
                          id="alert_threshold"
                          type="number"
                          value={formData.alert_threshold}
                          onChange={(e) => setFormData({ ...formData, alert_threshold: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="site">Site</Label>
                        <Select
                          value={formData.site_id}
                          onValueChange={(value: string) => setFormData({ ...formData, site_id: value })}
                          disabled={sitesLoading || sites.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un site" />
                          </SelectTrigger>
                          <SelectContent>
                            {sitesLoading ? (
                                                    <SelectItem value="loading-sites" disabled>Chargement des sites...</SelectItem>
                                                  ) : sites.length === 0 ? (
                                                    <SelectItem value="no-sites" disabled>Aucun site disponible</SelectItem>                            ) : (
                              sites.map((site) => (
                                <SelectItem key={site.id} value={site.id}>
                                  {site.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDialog;