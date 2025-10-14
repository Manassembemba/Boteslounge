
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Vérifier que l'appelant est un admin
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: callingUser } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!callingUser) throw new Error("Accès non autorisé");

    const { data: userRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", callingUser.id).single();
    if (userRole?.role !== "admin") throw new Error("Seuls les administrateurs peuvent modifier des utilisateurs");

    // 2. Récupérer les données à mettre à jour
    const { userIdToUpdate, fullName, role, password, siteId } = await req.json();
    if (!userIdToUpdate) throw new Error("L'ID de l'utilisateur à modifier est manquant.");

    // 3. Construire le payload de mise à jour pour l'utilisateur
    const userUpdatePayload: any = {
      user_metadata: { full_name: fullName },
    };

    if (password) {
      if (password.length < 6) {
        throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
      }
      userUpdatePayload.password = password;
    }

    // 4. Mettre à jour l'utilisateur
    const { error: userUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userIdToUpdate,
      userUpdatePayload
    );
    if (userUpdateError) throw userUpdateError;

    // 5. Mettre à jour le profil (nom complet et site_id)
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: fullName, site_id: siteId })
      .eq("id", userIdToUpdate);
    if (profileUpdateError) throw profileUpdateError;

    // 6. Mettre à jour le rôle de l'utilisateur
    const { error: roleUpdateError } = await supabaseAdmin
      .from("user_roles")
      .update({ role })
      .eq("user_id", userIdToUpdate);
    if (roleUpdateError) throw roleUpdateError;

    return new Response(JSON.stringify({ message: "Utilisateur modifié avec succès" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
