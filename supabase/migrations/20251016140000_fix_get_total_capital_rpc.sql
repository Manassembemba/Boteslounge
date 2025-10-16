-- Met à jour la fonction get_total_capital.
-- NOTE: La table capital_transactions n'a pas de colonne site_id, donc cette fonction calcule toujours le grand total.
-- Le paramètre p_site_id est conservé pour la compatibilité de l'appel mais n'est pas utilisé.
CREATE OR REPLACE FUNCTION public.get_total_capital(p_site_id uuid DEFAULT NULL)
RETURNS numeric AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.capital_transactions
        WHERE type = 'investment'
    ) - (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.capital_transactions
        WHERE type = 'withdrawal'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
