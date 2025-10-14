ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Supprime la politique si elle existe déjà pour éviter les erreurs
DROP POLICY IF EXISTS "Allow users to read their own role" ON public.user_roles;

-- Crée la politique
CREATE POLICY "Allow users to read their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);
