create type "public"."capital_transaction_type" as enum ('investment', 'withdrawal', 'sale_profit');

create type "public"."movement_type" as enum ('in', 'out', 'adjustment');

create type "public"."product_category" as enum ('alcoholic', 'non_alcoholic', 'cocktail', 'snack');

create type "public"."user_role" as enum ('admin', 'cashier', 'manager');

create table "public"."capital_transactions" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "amount" numeric not null,
    "type" capital_transaction_type not null,
    "description" text,
    "sale_id" uuid
);


alter table "public"."capital_transactions" enable row level security;

create table "public"."products" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "category" product_category not null,
    "purchase_price" numeric(10,2) not null,
    "selling_price" numeric(10,2) not null,
    "stock" integer not null default 0,
    "alert_threshold" integer not null default 5,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "image_url" text,
    "site_id" uuid not null
);


alter table "public"."products" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "email" text not null,
    "full_name" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "site_id" uuid not null
);


alter table "public"."profiles" enable row level security;

create table "public"."sale_items" (
    "id" uuid not null default gen_random_uuid(),
    "sale_id" uuid not null,
    "product_id" uuid not null,
    "quantity" integer not null,
    "unit_price" numeric(10,2) not null,
    "subtotal" numeric(10,2) not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."sale_items" enable row level security;

create table "public"."sales" (
    "id" uuid not null default gen_random_uuid(),
    "cashier_id" uuid not null,
    "total" numeric(10,2) not null,
    "profit" numeric(10,2) not null,
    "created_at" timestamp with time zone not null default now(),
    "site_id" uuid not null
);


alter table "public"."sales" enable row level security;

create table "public"."sites" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "address" text,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."sites" enable row level security;

create table "public"."stock_alerts" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "message" text not null,
    "is_resolved" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."stock_alerts" enable row level security;

create table "public"."stock_movements" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "user_id" uuid not null,
    "type" movement_type not null,
    "quantity" integer not null,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "site_id" uuid not null
);


alter table "public"."stock_movements" enable row level security;

create table "public"."user_roles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "role" user_role not null default 'cashier'::user_role
);


alter table "public"."user_roles" enable row level security;

CREATE UNIQUE INDEX capital_transactions_pkey ON public.capital_transactions USING btree (id);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX sale_items_pkey ON public.sale_items USING btree (id);

CREATE UNIQUE INDEX sales_pkey ON public.sales USING btree (id);

CREATE UNIQUE INDEX sites_name_key ON public.sites USING btree (name);

CREATE UNIQUE INDEX sites_pkey ON public.sites USING btree (id);

CREATE UNIQUE INDEX stock_alerts_pkey ON public.stock_alerts USING btree (id);

CREATE UNIQUE INDEX stock_movements_pkey ON public.stock_movements USING btree (id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

CREATE UNIQUE INDEX user_roles_user_id_key ON public.user_roles USING btree (user_id);

CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role);

alter table "public"."capital_transactions" add constraint "capital_transactions_pkey" PRIMARY KEY using index "capital_transactions_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."sale_items" add constraint "sale_items_pkey" PRIMARY KEY using index "sale_items_pkey";

alter table "public"."sales" add constraint "sales_pkey" PRIMARY KEY using index "sales_pkey";

alter table "public"."sites" add constraint "sites_pkey" PRIMARY KEY using index "sites_pkey";

alter table "public"."stock_alerts" add constraint "stock_alerts_pkey" PRIMARY KEY using index "stock_alerts_pkey";

alter table "public"."stock_movements" add constraint "stock_movements_pkey" PRIMARY KEY using index "stock_movements_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."products" add constraint "products_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE not valid;

alter table "public"."products" validate constraint "products_site_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_site_id_fkey";

alter table "public"."sale_items" add constraint "sale_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) not valid;

alter table "public"."sale_items" validate constraint "sale_items_product_id_fkey";

alter table "public"."sale_items" add constraint "sale_items_sale_id_fkey" FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE not valid;

alter table "public"."sale_items" validate constraint "sale_items_sale_id_fkey";

alter table "public"."sales" add constraint "sales_cashier_id_fkey" FOREIGN KEY (cashier_id) REFERENCES profiles(id) not valid;

alter table "public"."sales" validate constraint "sales_cashier_id_fkey";

alter table "public"."sales" add constraint "sales_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE not valid;

alter table "public"."sales" validate constraint "sales_site_id_fkey";

alter table "public"."sites" add constraint "sites_name_key" UNIQUE using index "sites_name_key";

alter table "public"."stock_alerts" add constraint "stock_alerts_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."stock_alerts" validate constraint "stock_alerts_product_id_fkey";

alter table "public"."stock_movements" add constraint "stock_movements_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."stock_movements" validate constraint "stock_movements_product_id_fkey";

alter table "public"."stock_movements" add constraint "stock_movements_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE not valid;

alter table "public"."stock_movements" validate constraint "stock_movements_site_id_fkey";

alter table "public"."stock_movements" add constraint "stock_movements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) not valid;

alter table "public"."stock_movements" validate constraint "stock_movements_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_key" UNIQUE using index "user_roles_user_id_key";

alter table "public"."user_roles" add constraint "user_roles_user_id_role_key" UNIQUE using index "user_roles_user_id_role_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.decrement_product_stock(product_id_arg uuid, quantity_arg integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.products
  SET stock = stock - quantity_arg
  WHERE id = product_id_arg;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrement_stock_from_sale(sale_id_arg uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item RECORD;
BEGIN
  FOR item IN 
    SELECT product_id, quantity FROM public.sale_items WHERE sale_id = sale_id_arg
  LOOP
    UPDATE public.products
    SET stock = stock - item.quantity
    WHERE id = item.product_id;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_total_capital()
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_total_capital(p_site_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  stock_value numeric;
  net_transactions numeric;
BEGIN
  -- Calcule la valeur totale des produits en stock pour le site donné
  SELECT COALESCE(SUM(purchase_price * stock), 0)
  INTO stock_value
  FROM public.products
  WHERE site_id = p_site_id;

  -- Calcule la somme nette des transactions (bénéfices - retraits) pour le site donné
  SELECT COALESCE(SUM(amount), 0)
  INTO net_transactions
  FROM public.capital_transactions
  WHERE site_id = p_site_id;

  -- Le capital total est la valeur du stock plus les bénéfices nets
  RETURN stock_value + net_transactions;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_total_sale_profit()
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.capital_transactions
  WHERE type = 'sale_profit';
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_site_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT site_id
  FROM public.profiles
  WHERE id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- First user becomes admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cashier');
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_sale_profit_to_capital()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Insère une nouvelle transaction dans la table de capital avec le bénéfice de la nouvelle vente
  INSERT INTO public.capital_transactions (amount, type, description, sale_id)
  VALUES (NEW.profit, 'sale_profit', 'Bénéfice de la vente #' || NEW.id::text, NEW.id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

create policy "Allow admins full access to capital transactions"
on "public"."capital_transactions"
as permissive
for all
to public
using ((( SELECT user_roles.role
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())) = 'admin'::user_role))
with check ((( SELECT user_roles.role
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())) = 'admin'::user_role));


create policy "Admins and managers can manage products"
on "public"."products"
as permissive
for all
to public
using ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)));


create policy "Admins can manage all products"
on "public"."products"
as permissive
for all
to public
using ((( SELECT user_roles.role
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())) = 'admin'::user_role))
with check ((( SELECT user_roles.role
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())) = 'admin'::user_role));


create policy "Anyone can view products"
on "public"."products"
as permissive
for select
to public
using (true);


create policy "Users can view/manage products from their assigned site"
on "public"."products"
as permissive
for all
to public
using ((site_id = get_user_site_id()))
with check ((site_id = get_user_site_id()));


create policy "Users can update own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can view all profiles"
on "public"."profiles"
as permissive
for select
to public
using (true);


create policy "Anyone can view sale items"
on "public"."sale_items"
as permissive
for select
to public
using (true);


create policy "Authenticated users can create sale items"
on "public"."sale_items"
as permissive
for insert
to public
with check (true);


create policy "Admins can manage all sales"
on "public"."sales"
as permissive
for all
to public
using ((( SELECT user_roles.role
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())) = 'admin'::user_role))
with check ((( SELECT user_roles.role
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())) = 'admin'::user_role));


create policy "Anyone can view sales"
on "public"."sales"
as permissive
for select
to public
using (true);


create policy "Authenticated users can create sales"
on "public"."sales"
as permissive
for insert
to public
with check ((auth.uid() = cashier_id));


create policy "Users can view/manage sales from their assigned site"
on "public"."sales"
as permissive
for all
to public
using ((site_id = get_user_site_id()))
with check ((site_id = get_user_site_id()));


create policy "Admins can manage sites"
on "public"."sites"
as permissive
for all
to public
using ((( SELECT user_roles.role
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())) = 'admin'::user_role))
with check ((( SELECT user_roles.role
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())) = 'admin'::user_role));


create policy "Sites are viewable by authenticated users"
on "public"."sites"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Admins and managers can manage alerts"
on "public"."stock_alerts"
as permissive
for all
to public
using ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)));


create policy "Anyone can view stock alerts"
on "public"."stock_alerts"
as permissive
for select
to public
using (true);


create policy "Admins can manage all stock movements"
on "public"."stock_movements"
as permissive
for all
to public
using ((( SELECT user_roles.role
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())) = 'admin'::user_role))
with check ((( SELECT user_roles.role
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())) = 'admin'::user_role));


create policy "Anyone can view stock movements"
on "public"."stock_movements"
as permissive
for select
to public
using (true);


create policy "Authenticated users can create stock movements"
on "public"."stock_movements"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can view/manage stock movements from their assigned site"
on "public"."stock_movements"
as permissive
for all
to public
using ((site_id = get_user_site_id()))
with check ((site_id = get_user_site_id()));


create policy "Allow users to read their own role"
on "public"."user_roles"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Anyone can view user roles"
on "public"."user_roles"
as permissive
for select
to public
using (true);


create policy "Only admins can manage roles"
on "public"."user_roles"
as permissive
for all
to public
using (has_role(auth.uid(), 'admin'::user_role));


CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER on_sale_insert_add_profit_to_capital AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION handle_sale_profit_to_capital();


