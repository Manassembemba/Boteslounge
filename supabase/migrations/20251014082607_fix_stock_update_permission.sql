CREATE OR REPLACE FUNCTION public.decrement_stock_from_sale(sale_id_arg UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN 
    SELECT product_id, quantity FROM public.sale_items WHERE sale_id = sale_id_arg
  LOOP
    UPDATE public.products
    SET stock = stock - item.quantity
    WHERE id = item.product_id;
  END LOOP;
END;
$$;
