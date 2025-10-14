
-- Crée une fonction SQL pour calculer la somme des transactions de type 'sale_profit'
CREATE OR REPLACE FUNCTION public.get_total_sale_profit()
RETURNS numeric AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.capital_transactions
  WHERE type = 'sale_profit';
$$ LANGUAGE sql STABLE;
