-- Cette fonction calcule le capital total. Si p_site_id est NULL, elle agrège tous les sites.
CREATE OR REPLACE FUNCTION public.get_total_capital(p_site_id uuid DEFAULT NULL)
RETURNS numeric AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.capital_transactions
        WHERE type = 'investment'
          AND (p_site_id IS NULL OR site_id = p_site_id)
    ) - (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.capital_transactions
        WHERE type = 'withdrawal'
          AND (p_site_id IS NULL OR site_id = p_site_id)
    );
END;
$$ LANGUAGE plpgsql;

-- Cette fonction calcule le profit total. Si p_site_id est NULL, elle agrège tous les sites.
CREATE OR REPLACE FUNCTION public.get_total_sale_profit(p_site_id uuid DEFAULT NULL)
RETURNS numeric AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(profit), 0)
        FROM public.sales
        WHERE (p_site_id IS NULL OR site_id = p_site_id)
    );
END;
$$ LANGUAGE plpgsql;
