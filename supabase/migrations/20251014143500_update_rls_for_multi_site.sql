
-- RLS pour la table products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Supprime les politiques existantes si elles existent (pour éviter les conflits)
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;

-- Politique : Les admins peuvent gérer tous les produits
CREATE POLICY "Admins can manage all products"
ON public.products
FOR ALL
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- Politique : Les utilisateurs peuvent voir/gérer les produits de leur site assigné
CREATE POLICY "Users can view/manage products from their assigned site"
ON public.products
FOR ALL
USING (site_id = public.get_user_site_id())
WITH CHECK (site_id = public.get_user_site_id());


-- RLS pour la table sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Supprime les politiques existantes si elles existent
DROP POLICY IF EXISTS "Admins can manage all sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view/manage sales from their assigned site" ON public.sales;

-- Politique : Les admins peuvent gérer toutes les ventes
CREATE POLICY "Admins can manage all sales"
ON public.sales
FOR ALL
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- Politique : Les utilisateurs peuvent voir/gérer les ventes de leur site assigné
CREATE POLICY "Users can view/manage sales from their assigned site"
ON public.sales
FOR ALL
USING (site_id = public.get_user_site_id())
WITH CHECK (site_id = public.get_user_site_id());


-- RLS pour la table stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Supprime les politiques existantes si elles existent
DROP POLICY IF EXISTS "Admins can manage all stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Users can view/manage stock movements from their assigned site" ON public.stock_movements;

-- Politique : Les admins peuvent gérer tous les mouvements de stock
CREATE POLICY "Admins can manage all stock movements"
ON public.stock_movements
FOR ALL
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- Politique : Les utilisateurs peuvent voir/gérer les mouvements de stock de leur site assigné
CREATE POLICY "Users can view/manage stock movements from their assigned site"
ON public.stock_movements
FOR ALL
USING (site_id = public.get_user_site_id())
WITH CHECK (site_id = public.get_user_site_id());
