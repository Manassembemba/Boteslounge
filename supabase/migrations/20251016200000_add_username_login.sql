-- 1. Ajouter la colonne username à la table profiles
ALTER TABLE public.profiles
ADD COLUMN username TEXT UNIQUE;

-- Mettre à jour les profils existants avec une valeur par défaut (leur email avant le @)
UPDATE public.profiles
SET username = split_part(email, '@', 1)
WHERE username IS NULL;

-- Rendre la colonne NOT NULL après la mise à jour
ALTER TABLE public.profiles
ALTER COLUMN username SET NOT NULL;

-- 2. Créer une fonction pour obtenir l'email à partir d'un username
CREATE OR REPLACE FUNCTION get_email_for_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM public.profiles
  WHERE username = p_username;
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Donner les permissions pour appeler cette fonction
GRANT EXECUTE ON FUNCTION public.get_email_for_username(TEXT) TO anon, authenticated;
