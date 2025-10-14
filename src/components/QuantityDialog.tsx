
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface QuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; name: string; stock: number; selling_price: number } | null;
  onAddToCart: (product: { id: string; name: string; stock: number; selling_price: number }, quantity: number) => void;
}

const QuantityDialog = ({
  open,
  onOpenChange,
  product,
  onAddToCart,
}: QuantityDialogProps) => {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && product) {
      setQuantity(1);
    } else if (!open) {
      setQuantity(1);
    }
  }, [open, product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const numQuantity = parseInt(quantity.toString());

    if (isNaN(numQuantity) || numQuantity <= 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer une quantité valide et positive.",
      });
      return;
    }

    if (numQuantity > product.stock) {
      toast({
        variant: "destructive",
        title: "Stock insuffisant",
        description: `Seulement ${product.stock} ${product.name} en stock.`, // Correction ici
      });
      return;
    }

    onAddToCart(product, numQuantity);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter {product?.name} au panier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
              max={product?.stock || 1}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              Ajouter au panier
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuantityDialog;
