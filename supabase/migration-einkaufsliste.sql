-- ============ Einkaufsliste (v0.46) ============
-- Einmal im Supabase SQL Editor ausführen (SQL Editor → New query → einfügen → Run).
-- Ist auch in schema.sql enthalten; dieses Skript ist nur für bestehende Datenbanken.
-- Kann gefahrlos mehrfach ausgeführt werden.

-- Ein Eintrag pro Rezept, das auf der Einkaufsliste steht.
create table if not exists shopping_list_recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null default auth.uid(),
  recipe_id uuid references recipes(id) on delete cascade not null,
  portionen integer not null,
  created_at timestamptz default now(),
  unique (owner_id, recipe_id)          -- jedes Rezept höchstens einmal pro Person
);

-- Die angehakten Zutaten eines Rezepts auf der Einkaufsliste.
-- Verweist auf den gemeinsamen Zutaten-Pool (ingredients) statt den Namen zu kopieren.
create table if not exists shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_recipe_id uuid references shopping_list_recipes(id) on delete cascade not null,
  ingredient_id uuid references ingredients(id) on delete cascade not null,
  menge numeric,                        -- schon auf die gewählten Portionen umgerechnet
  einheit text,
  erledigt boolean not null default false,
  created_at timestamptz default now()
);

-- Row Level Security: jede Person sieht und ändert nur ihre eigene Einkaufsliste.
alter table shopping_list_recipes enable row level security;
alter table shopping_list_items enable row level security;

drop policy if exists "Eigene Einkaufsliste" on shopping_list_recipes;
create policy "Eigene Einkaufsliste" on shopping_list_recipes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Einkaufslisten-Zutaten über eigene Liste" on shopping_list_items;
create policy "Einkaufslisten-Zutaten über eigene Liste" on shopping_list_items
  for all using (
    exists (
      select 1 from shopping_list_recipes
      where shopping_list_recipes.id = shopping_list_items.list_recipe_id
        and shopping_list_recipes.owner_id = auth.uid()
    )
  );
