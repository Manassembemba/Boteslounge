import { Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user?: {
    id: string;
    full_name: string;
    email: string;
    user_roles: { role: string };
    profiles?: { site_id: string }; // Make profiles optional to handle different shapes
  } | null;
}

const UserDialog = ({ open, onOpenChange, onSuccess, user }: UserDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const formSchema = z.object({
    email: z.string().email({ message: "Adresse e-mail invalide." }),
    password: z.string().optional(),
    full_name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères." }),
    username: z.string().min(3, { message: "Le nom d'utilisateur doit contenir au moins 3 caractères." }),
    role: z.enum(['admin', 'manager', 'cashier']),
    site_id: z.string().uuid().optional(),
  }).refine(data => user || data.password, { 
    message: "Le mot de passe est requis.",
    path: ["password"],
  }).refine(data => !data.password || data.password.length >= 6, {
    message: "Le mot de passe doit contenir au moins 6 caractères.",
    path: ["password"],
  }).refine(data => data.role === 'admin' || !!data.site_id, {
    message: "Veuillez sélectionner un site pour les rôles autres qu'administrateur.",
    path: ["site_id"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      role: "cashier",
      site_id: "",
    },
  });

  const roleValue = form.watch("role");

  useEffect(() => {
    const fetchSites = async () => {
      setSitesLoading(true);
      const { data, error } = await supabase.from("sites").select("id, name").order("name");
      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les sites." });
      } else {
        setSites(data || []);
      }
      setSitesLoading(false);
    };

    if (open) {
      fetchSites();
    }
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      if (user) {
        // @ts-ignore
        const siteId = user.site_id || user.profiles?.site_id || "";
        form.reset({
          email: user.email,
          password: "",
          full_name: user.full_name || "",
          role: user.user_roles.role as 'admin' | 'manager' | 'cashier',
          site_id: siteId,
        });
      } else {
        form.reset({
          email: "",
          password: "",
          full_name: "",
          role: "cashier",
          site_id: "",
        });
      }
    }
  }, [user, open, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      let error;
      if (user) {
        // Mode édition: appeler la Edge Function 'update-user'
        const { error: updateError } = await supabase.functions.invoke("update-user", {
          body: {
            userIdToUpdate: user.id,
            fullName: values.full_name,
            role: values.role,
            siteId: values.site_id, // La fonction attend 'siteId' en camelCase
            ...(values.password && { password: values.password }),
          },
        });
        error = updateError;
      } else {
        // Mode création: appeler la Edge Function 'create-user'
        const { error: createError } = await supabase.functions.invoke("create-user", {
          body: values, // Le formulaire a déjà les bons noms de champ (dont site_id)
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
      const errorMessage = error.context?.body?.error || error.message || "Une erreur inconnue est survenue.";
      
      toast({
        variant: "destructive",
        title: user ? "Erreur lors de la modification" : "Erreur lors de la création",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Modifier l\'utilisateur" : "Créer un utilisateur"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nom complet</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom d'utilisateur</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={!!user} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={!!user} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{user ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} {...field} className="pr-10" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cashier">Caissier</SelectItem>
                      <SelectItem value="manager">Gestionnaire</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {roleValue !== 'admin' && (
              <FormField
                control={form.control}
                name="site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={sitesLoading || sites.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sitesLoading ? (
                          <SelectItem value="loading" disabled>Chargement...</SelectItem>
                        ) : (
                          sites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (user ? "Modification..." : "Création...") : (user ? "Modifier" : "Créer")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;