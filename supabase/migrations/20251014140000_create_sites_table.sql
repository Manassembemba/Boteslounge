
-- Crée la table des sites
CREATE TABLE public.sites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sites_pkey PRIMARY KEY (id)
);

-- Active la sécurité au niveau des lignes (RLS)
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour les sites (visible par tous les utilisateurs authentifiés)
CREATE POLICY "Sites are viewable by authenticated users" ON public.sites
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique RLS pour les admins (accès complet)
CREATE POLICY "Admins can manage sites" ON public.sites
  FOR ALL USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
