-- 1. Créer un nouveau schéma pour les fonctions de l'application
CREATE SCHEMA IF NOT EXISTS app;

-- 2. Déplacer la fonction dans le nouveau schéma
CREATE OR REPLACE FUNCTION app.add_stock(
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

-- 3. Accorder les permissions sur le nouveau schéma et la nouvelle fonction
GRANT USAGE ON SCHEMA app TO authenticated;
GRANT EXECUTE ON FUNCTION app.add_stock(p_product_id uuid, p_quantity integer, p_user_id uuid, p_site_id uuid, p_notes text) TO authenticated;

-- 4. (Optionnel mais propre) Supprimer l'ancienne fonction du schéma public
DROP FUNCTION IF EXISTS public.add_stock(p_product_id uuid, p_quantity integer, p_user_id uuid, p_site_id uuid, p_notes text);
