
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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Vérifier que l'appelant est un admin
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: callingUser } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (!callingUser) {
      return new Response(JSON.stringify({ error: "Accès non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: userRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", callingUser.id).single();

    if (userRole?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Seuls les administrateurs peuvent supprimer des utilisateurs" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Récupérer l'ID de l'utilisateur à supprimer
    const { userIdToDelete } = await req.json();
    if (!userIdToDelete) {
      throw new Error("L'ID de l'utilisateur à supprimer est manquant.");
    }

    // 3. Empêcher un admin de se supprimer lui-même
    if (callingUser.id === userIdToDelete) {
        return new Response(JSON.stringify({ error: "Un administrateur ne peut pas se supprimer lui-même." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Supprimer l'utilisateur
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ message: "Utilisateur supprimé avec succès" }), {
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
