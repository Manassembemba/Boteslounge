
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Définition des types pour plus de clarté
type UserRole = "admin" | "manager" | "cashier";

interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

serve(async (req) => {
  // Gérer la requête pre-flight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Créer un client Supabase avec les droits d'administration
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 2. Vérifier le rôle de l'utilisateur qui fait la requête
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (!user) {
      return new Response(JSON.stringify({ error: "Accès non autorisé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: userRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || userRole?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Seuls les administrateurs peuvent créer des utilisateurs" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    // 3. Créer le nouvel utilisateur
    const { email, password, full_name, role } = (await req.json()) as CreateUserPayload;

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // L'email est automatiquement confirmé
        user_metadata: { full_name },
      });

    if (createError) {
      throw createError;
    }
    if (!newUser.user) {
      throw new Error("La création de l'utilisateur a échoué.");
    }

    // 4. Assigner le rôle au nouvel utilisateur (en utilisant upsert)
    const { error: upsertError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUser.user.id, role }, { onConflict: "user_id" });

    if (upsertError) {
      // En cas d'échec, supprimer l'utilisateur créé pour éviter les orphelins
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw upsertError;
    }

    return new Response(JSON.stringify({ message: "Utilisateur créé avec succès" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
