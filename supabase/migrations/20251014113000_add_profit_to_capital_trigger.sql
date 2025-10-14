
-- Crée la fonction qui sera exécutée par le trigger
CREATE OR REPLACE FUNCTION public.handle_sale_profit_to_capital()
RETURNS TRIGGER AS $$
BEGIN
  -- Insère une nouvelle transaction dans la table de capital avec le bénéfice de la nouvelle vente
  INSERT INTO public.capital_transactions (amount, type, description, sale_id)
  VALUES (NEW.profit, 'sale_profit', 'Bénéfice de la vente #' || NEW.id::text, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crée le trigger qui s'active après chaque insertion dans la table 'sales'
DROP TRIGGER IF EXISTS on_sale_insert_add_profit_to_capital ON public.sales;
CREATE TRIGGER on_sale_insert_add_profit_to_capital
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.handle_sale_profit_to_capital();
