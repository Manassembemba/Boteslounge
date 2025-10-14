
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SiteDialog from "@/components/SiteDialog"; // Nous allons créer ce composant ensuite

interface Site {
  id: string;
  name: string;
  address: string;
}

const Sites = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    const { data, error } = await supabase
      .from("sites")
      .select("id, name, address")
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les sites",
      });
      return;
    }
    setSites(data || []);
  };

  const handleDelete = async () => {
    if (!siteToDelete) return;

    const { error } = await supabase.from("sites").delete().eq("id", siteToDelete);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le site",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Site supprimé",
    });
    loadSites();
    setDeleteDialogOpen(false);
    setSiteToDelete(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sites</h1>
            <p className="text-muted-foreground">Gérez les différents sites de votre entreprise</p>
          </div>
          <Button
            onClick={() => {
              setSelectedSite(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un site
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Card key={site.id} className="border-border bg-card/50 shadow-card backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">{site.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{site.address}</p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedSite(site);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSiteToDelete(site.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <SiteDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={loadSites} site={selectedSite} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le site sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Sites;
