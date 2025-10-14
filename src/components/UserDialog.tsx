import { Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user?: { id: string; full_name: string; email: string; user_roles: { role: string }; site_id: string; site_name: string } | null;
}

const UserDialog = ({ open, onOpenChange, onSuccess, user }: UserDialogProps) => {
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
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "cashier" as "admin" | "manager" | "cashier",
    site_id: "", // Ajout du site_id
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: "", // Le mot de passe n'est pas modifié ici
        full_name: user.full_name || "",
        role: user.user_roles.role as "admin" | "manager" | "cashier",
        site_id: user.site_id, // Initialise avec le site de l'utilisateur
      });
    } else {
      setFormData({
        email: "",
        password: "",
        full_name: "",
        role: "cashier",
        site_id: sites.length > 0 ? sites[0].id : "", // Sélectionne le premier site par défaut
      });
    }
  }, [user, open, sites]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let error;
      if (user) {
        // Mode édition
        const { error: updateError } = await supabase.functions.invoke("update-user", {
          body: {
            userIdToUpdate: user.id,
            fullName: formData.full_name,
            role: formData.role,
            ...(formData.password && { password: formData.password }), // N'inclut le mot de passe que s'il est fourni
          },
        });
        error = updateError;
      } else {
        // Mode création
        const { error: createError } = await supabase.functions.invoke("create-user", {
          body: formData,
        });
        error = createError;
      }

      if (error) throw error;

      toast({
        title: "Succès",
        description: user ? "Utilisateur modifié avec succès" : "Utilisateur créé avec succès",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      const rawMessage = error.context?.body?.error || error.message;
      let displayMessage = rawMessage;

      if (rawMessage.includes("User already registered")) {
        displayMessage = "Un utilisateur avec cette adresse e-mail existe déjà.";
      } else if (rawMessage.includes("Password should be at least 6 characters")) {
        displayMessage = "Le mot de passe doit contenir au moins 6 caractères.";
      }

      toast({
        variant: "destructive",
        title: user ? "Erreur lors de la modification" : "Erreur lors de la création",
        description: displayMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Modifier l'utilisateur" : "Créer un utilisateur"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nom complet</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={!!user} // Désactivé en mode édition
            />
          </div>
          <div className="space-y-2 relative">
            <Label htmlFor="password">{user ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}</Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user} // Requis seulement en mode création
              minLength={6}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select
              value={formData.role}
              onValueChange={(value: any) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cashier">Caissier</SelectItem>
                <SelectItem value="manager">Gestionnaire</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
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
                                        <SelectItem value="no-sites" disabled>Aucun site disponible</SelectItem>                ) : (
                  sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;
