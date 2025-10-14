import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sale_id } = await req.json();
    if (!sale_id) {
      throw new Error("Missing sale_id in request body");
    }

    // Create an admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get sale items from the sale_id
    const { data: saleItems, error: itemsError } = await supabaseAdmin
      .from("sale_items")
      .select("product_id, quantity")
      .eq("sale_id", sale_id);

    if (itemsError) throw itemsError;

    // Create an array of promises for all stock updates
    const updatePromises = saleItems.map(async (item) => {
      const { error: rpcError } = await supabaseAdmin.rpc("decrement_product_stock", {
        product_id_arg: item.product_id,
        quantity_arg: item.quantity,
      });
      if (rpcError) throw rpcError;
    });

    await Promise.all(updatePromises);

    return new Response(JSON.stringify({ message: "Stock updated successfully" }), {
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

// To deploy:
// supabase functions deploy update-stock-on-sale --no-verify-jwt