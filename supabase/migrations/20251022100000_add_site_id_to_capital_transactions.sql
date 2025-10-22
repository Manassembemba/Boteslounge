-- Add site_id to capital_transactions
ALTER TABLE public.capital_transactions
ADD COLUMN site_id UUID REFERENCES public.sites(id);

-- Update the get_total_capital function to filter by site_id
CREATE OR REPLACE FUNCTION public.get_total_capital(p_site_id uuid DEFAULT NULL)
RETURNS numeric AS $$
DECLARE
    total_investment numeric;
    total_withdrawal numeric;
BEGIN
    -- Calculate total investment
    SELECT COALESCE(SUM(amount), 0)
    INTO total_investment
    FROM public.capital_transactions
    WHERE type = 'investment'
      AND (p_site_id IS NULL OR site_id = p_site_id);

    -- Calculate total withdrawal
    SELECT COALESCE(SUM(amount), 0)
    INTO total_withdrawal
    FROM public.capital_transactions
    WHERE type = 'withdrawal'
      AND (p_site_id IS NULL OR site_id = p_site_id);

    RETURN total_investment - total_withdrawal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_total_sale_profit function to filter by site_id
CREATE OR REPLACE FUNCTION public.get_total_sale_profit(p_site_id uuid DEFAULT NULL)
RETURNS numeric AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(profit), 0)
        FROM public.sales
        WHERE (p_site_id IS NULL OR site_id = p_site_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;