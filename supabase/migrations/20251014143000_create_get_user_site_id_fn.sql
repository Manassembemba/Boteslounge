
-- Fonction pour récupérer l'ID du site de l'utilisateur actuellement connecté
CREATE OR REPLACE FUNCTION public.get_user_site_id()
RETURNS uuid AS $$
  SELECT site_id
  FROM public.profiles
  WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
