
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CapitalTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  transactionType: "investment" | "withdrawal";
  selectedSiteId: string | null;
}

const CapitalTransactionDialog = ({
  open,
  onOpenChange,
  onSuccess,
  transactionType,
  selectedSiteId,
}: CapitalTransactionDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) {
      setAmount("");
      setDescription("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer un montant valide et positif.",
      });
      setLoading(false);
      return;
    }

    // We will create and call this function next
    const { error } = await supabase.functions.invoke("add-capital-transaction", {
      body: {
        amount: numericAmount,
        description,
        type: transactionType,
        site_id: selectedSiteId,
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } else {
      toast({
        title: "Succès",
        description: "Transaction enregistrée avec succès.",
      });
      onSuccess();
      onOpenChange(false);
    }

    setLoading(false);
  };

  const title = transactionType === "investment" ? "Ajouter un investissement" : "Faire un retrait";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant (FC)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Apport personnel, Achat matériel..."
            />
          </div>
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

export default CapitalTransactionDialog;
