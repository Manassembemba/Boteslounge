
-- Ajoute la colonne site_id à la table sales
ALTER TABLE public.sales
ADD COLUMN site_id uuid;

-- Met à jour les ventes existantes pour les lier au site par défaut
-- Ceci suppose qu'il y a au moins un site dans la table 'sites'
UPDATE public.sales
SET site_id = (SELECT id FROM public.sites LIMIT 1)
WHERE site_id IS NULL;

-- Rend la colonne site_id non nulle
ALTER TABLE public.sales
ALTER COLUMN site_id SET NOT NULL;

-- Ajoute la contrainte de clé étrangère
ALTER TABLE public.sales
ADD CONSTRAINT sales_site_id_fkey
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
