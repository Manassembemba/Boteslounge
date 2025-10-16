CREATE OR REPLACE FUNCTION add_stock(
  p_product_id uuid,
  p_quantity integer,
  p_user_id uuid,
  p_site_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Augmenter le stock dans la table des produits
  UPDATE public.products
  SET stock = stock + p_quantity
  WHERE id = p_product_id;

  -- Enregistrer le mouvement de stock
  INSERT INTO public.stock_movements (product_id, user_id, type, quantity, notes, site_id)
  VALUES (p_product_id, p_user_id, 'in', p_quantity, p_notes, p_site_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder la permission d'exécution
GRANT EXECUTE ON FUNCTION public.add_stock(p_product_id uuid, p_quantity integer, p_user_id uuid, p_site_id uuid, p_notes text) TO authenticated;
