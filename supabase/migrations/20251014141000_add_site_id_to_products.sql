
-- Ajoute la colonne site_id à la table products
ALTER TABLE public.products
ADD COLUMN site_id uuid;

-- Met à jour les produits existants pour les lier au site par défaut
-- Ceci suppose qu'il y a au moins un site dans la table 'sites'
UPDATE public.products
SET site_id = (SELECT id FROM public.sites LIMIT 1)
WHERE site_id IS NULL;

-- Rend la colonne site_id non nulle
ALTER TABLE public.products
ALTER COLUMN site_id SET NOT NULL;

-- Ajoute la contrainte de clé étrangère
ALTER TABLE public.products
ADD CONSTRAINT products_site_id_fkey
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
