-- Keep product discount text synchronized with MRP and selling price.
-- Run this migration in Supabase after migrations 001-004.

create or replace function public.calculate_product_discount(
  p_price numeric,
  p_mrp numeric
)
returns text
language sql
immutable
as $$
  select case
    when p_mrp > 0 and p_price <= p_mrp
      then round((1 - p_price / p_mrp) * 100)::integer::text || '% off'
    else ''
  end;
$$;

create or replace function public.sync_product_discount()
returns trigger
language plpgsql
as $$
begin
  new.off := public.calculate_product_discount(new.price, new.mrp);
  return new;
end;
$$;

drop trigger if exists products_sync_discount on public.products;
create trigger products_sync_discount
  before insert or update of price, mrp, off on public.products
  for each row
  execute function public.sync_product_discount();

update public.products
set off = public.calculate_product_discount(price, mrp)
where off is distinct from public.calculate_product_discount(price, mrp);
