CREATE OR REPLACE FUNCTION public.decrement_product_stock(product_id_arg UUID, quantity_arg INT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - quantity_arg
  WHERE id = product_id_arg;
END;
$$;
