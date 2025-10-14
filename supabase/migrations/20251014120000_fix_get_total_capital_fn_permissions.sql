
-- Recrée la fonction avec SECURITY DEFINER pour lui donner les permissions nécessaires
-- pour lire les tables protégées comme 'products'.
CREATE OR REPLACE FUNCTION public.get_total_capital()
RETURNS numeric AS $$
DECLARE
  stock_value numeric;
  net_transactions numeric;
BEGIN
  -- Calcule la valeur totale des produits en stock (prix d'achat * quantité)
  SELECT COALESCE(SUM(purchase_price * stock), 0)
  INTO stock_value
  FROM public.products;

  -- Calcule la somme nette des transactions (bénéfices - retraits)
  SELECT COALESCE(SUM(amount), 0)
  INTO net_transactions
  FROM public.capital_transactions;

  -- Le capital total est la valeur du stock plus les bénéfices nets
  RETURN stock_value + net_transactions;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
