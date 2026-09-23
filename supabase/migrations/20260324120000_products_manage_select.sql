-- Product catalog managers must be able to re-read products they create.
-- Previously SELECT allowed only sees_all or assigned product_ids, so a role
-- with manage_products but without sees_all_products lost new rows on refresh.

drop policy if exists "Signed-in users read assigned products" on public.products;

create policy "Signed-in users read assigned products"
  on public.products for select to authenticated
  using (
    (select public.app_sees_all())
    or (select public.app_has('manage_products'))
    or id = any (public.app_products())
  );
