import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sale_item_id, product_id, quantity } = await req.json()
    console.log('cancel-sale: Received payload:', { sale_item_id, product_id, quantity });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // 1. Mark sale_item as cancelled
    const { data: updatedSaleItem, error: updateSaleItemError } = await supabaseClient
      .from('sale_items')
      .update({ is_cancelled: true })
      .eq('id', sale_item_id)
      .select(); // Added .select() to get the updated data

    if (updateSaleItemError) {
      console.error('cancel-sale: Error updating sale_item:', updateSaleItemError);
      throw updateSaleItemError
    }
    console.log('cancel-sale: Sale item update result:', updatedSaleItem);

    // 2. Restore product stock
    // First, fetch the current stock
    const { data: productData, error: fetchProductError } = await supabaseClient
      .from('products')
      .select('stock')
      .eq('id', product_id)
      .single();

    if (fetchProductError) {
      console.error('cancel-sale: Error fetching product stock:', fetchProductError);
      throw fetchProductError;
    }

    if (!productData) {
      throw new Error('Product not found');
    }

    const currentStock = productData.stock;
    const newStock = currentStock + quantity;

    // Then, update the stock with the new calculated value
    const { data: updatedProduct, error: updateStockError } = await supabaseClient
      .from('products')
      .update({ stock: newStock })
      .eq('id', product_id)
      .select(); // Added .select()

    if (updateStockError) {
      console.error('cancel-sale: Error updating product stock:', updateStockError);
      throw updateStockError;
    }
    console.log('cancel-sale: Product stock update result:', updatedProduct);

    return new Response(JSON.stringify({ message: 'Sale cancelled and stock restored successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('cancel-sale: Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
