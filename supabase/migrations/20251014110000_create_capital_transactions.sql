
-- Crée un type personnalisé pour les types de transactions
CREATE TYPE public.capital_transaction_type AS ENUM (
  'investment',
  'withdrawal',
  'sale_profit'
);

-- Crée la table des transactions de capital
CREATE TABLE public.capital_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  amount numeric NOT NULL,
  type public.capital_transaction_type NOT NULL,
  description text,
  sale_id uuid, -- Pour lier à une vente si c'est un bénéfice
  CONSTRAINT capital_transactions_pkey PRIMARY KEY (id)
);

-- Active la sécurité au niveau des lignes (RLS)
ALTER TABLE public.capital_transactions ENABLE ROW LEVEL SECURITY;

-- Crée une politique RLS pour autoriser l'accès complet aux administrateurs
CREATE POLICY "Allow admins full access to capital transactions"
ON public.capital_transactions
FOR ALL
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
