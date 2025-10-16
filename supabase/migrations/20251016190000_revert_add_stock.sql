-- Supprimer la fonction et le schéma liés à l'ajout de stock
DROP FUNCTION IF EXISTS app.add_stock(p_product_id uuid, p_quantity integer, p_user_id uuid, p_site_id uuid, p_notes text);
DROP SCHEMA IF EXISTS app;
