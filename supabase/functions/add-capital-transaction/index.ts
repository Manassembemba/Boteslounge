
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
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Accès non autorisé");

    const { data: userRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).single();
    if (userRole?.role !== "admin") throw new Error("Seuls les administrateurs peuvent ajouter des transactions.");

    // 2. Récupérer les données
    const { amount, description } = await req.json();
    if (!amount || amount <= 0) {
      throw new Error("Le montant du retrait est invalide.");
    }

    // 3. Le montant d'un retrait est toujours négatif
    const negativeAmount = -Math.abs(amount);

    // 4. Insérer la transaction
    const { error } = await supabaseAdmin.from("capital_transactions").insert([
      {
        amount: negativeAmount,
        description,
        type: 'withdrawal',
      },
    ]);

    if (error) throw error;

    return new Response(JSON.stringify({ message: "Transaction ajoutée" }), {
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
