
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import UserDialog from "@/components/UserDialog";
import { useUserRole } from "@/hooks/useUserRole";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  user_roles: { role: string };
}

const Users = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isAdmin } = useUserRole();
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, site_id, user_roles(role)")
      .order("email");

    setUsers(data || []);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    const { error } = await supabase.functions.invoke("delete-user", {
      body: { userIdToDelete: userToDelete },
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
        description: "Utilisateur supprimé",
      });
      loadUsers();
    }
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    admin: { label: "Administrateur", variant: "destructive" },
    manager: { label: "Gestionnaire", variant: "default" },
    cashier: { label: "Caissier", variant: "secondary" },
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Utilisateurs</h1>
            <p className="text-muted-foreground">Liste des utilisateurs du système</p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => {
                setSelectedUser(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un utilisateur
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card key={user.id} className="border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">{user.full_name || "Sans nom"}</CardTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.user_roles && (
                    <Badge variant={roleLabels[user.user_roles.role]?.variant || 'secondary'}>
                      {roleLabels[user.user_roles.role]?.label || user.user_roles.role}
                    </Badge>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  {isAdmin && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedUser(user);
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
                          setUserToDelete(user.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={loadUsers} user={selectedUser} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'utilisateur sera définitivement supprimé.
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

export default Users;

