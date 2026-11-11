-- Kochrezepte App — Datenbank-Schema für Supabase
-- Ausführen in: Supabase Dashboard → SQL Editor → "New query" → einfügen → Run

-- Erweiterung für UUIDs (in Supabase meist schon aktiv)
create extension if not exists "pgcrypto";

-- ============ NUTZERPROFILE (für Admin-Rechte) ============
-- Wird automatisch befüllt, sobald sich jemand registriert (siehe Trigger weiter unten).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

-- Prüft admin-Rechte, ohne dass RLS-Policies sich selbst rekursiv blockieren.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- Legt bei jeder Registrierung automatisch ein Profil an.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ ZUTATEN-KATEGORIEN (feste, admin-verwaltete Liste) ============
create table if not exists ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- ============ ZUTATEN (Stammdaten) ============
create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references ingredient_categories(id),
  created_at timestamptz default now()
);

-- ============ AUTOR:INNEN (Stammdaten, geteilter Pool wie Zutaten) ============
create table if not exists authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- ============ KOCHBÜCHER (eigene Verwaltung je Nutzer:in) ============
create table if not exists cookbooks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null default auth.uid(),
  name text not null,
  created_at timestamptz default now()
);

-- ============ SAMMLUNGEN (eigene Verwaltung je Nutzer:in, ein Rezept kann in mehreren sein) ============
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null default auth.uid(),
  name text not null,
  created_at timestamptz default now()
);

-- ============ KATEGORIEN (eigene Verwaltung je Nutzer:in) ============
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null default auth.uid(),
  name text not null,
  created_at timestamptz default now()
);

-- ============ TAGS (eigene Verwaltung je Nutzer:in, ein Rezept kann mehrere haben) ============
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null default auth.uid(),
  name text not null,
  created_at timestamptz default now()
);

-- ============ REZEPTE ============
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null default auth.uid(),
  titel text not null,
  beschreibung text,
  portionen_standard integer default 4,
  zubereitungszeit_min integer,
  kochzeit_min integer,
  schwierigkeit text check (schwierigkeit in ('einfach', 'mittel', 'schwer')),
  bild_url text,
  quelle text,                  -- Link, falls importiert
  category_id uuid references categories(id),
  author_id uuid references authors(id),
  cookbook_id uuid references cookbooks(id),
  -- Nährwerte, jeweils pro Portion, manuell eingetragen
  kalorien_kcal numeric,
  eiweiss_g numeric,
  fett_g numeric,
  kohlenhydrate_g numeric,
  ballaststoffe_g numeric,
  zucker_g numeric,
  created_at timestamptz default now()
);

-- ============ REZEPT-SAMMLUNGEN (Verknüpfung, n:m) ============
create table if not exists recipe_collections (
  recipe_id uuid references recipes(id) on delete cascade,
  collection_id uuid references collections(id) on delete cascade,
  primary key (recipe_id, collection_id)
);

-- ============ REZEPT-TAGS (Verknüpfung, n:m) ============
create table if not exists recipe_tags (
  recipe_id uuid references recipes(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

-- ============ REZEPT-ZUTATEN (Verknüpfung mit Menge) ============
create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade not null,
  ingredient_id uuid references ingredients(id) not null,
  menge numeric,
  einheit text,                 -- freies Textfeld (kein fester Wertebereich, siehe Formular)
  notiz text                    -- z.B. "gewürfelt", "optional"
);

-- Läuft serverseitig (SECURITY DEFINER, sieht also wirklich ALLE Verknüpfungen über alle
-- Nutzer:innen hinweg, nicht nur die per RLS sichtbaren) — löscht eine Zutat aus dem geteilten
-- Pool, sobald sie in KEINEM Rezept mehr vorkommt (egal von wem).
create or replace function cleanup_orphaned_ingredient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from recipe_ingredients where ingredient_id = old.ingredient_id
  ) then
    delete from ingredients where id = old.ingredient_id;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_cleanup_orphaned_ingredient on recipe_ingredients;
create trigger trg_cleanup_orphaned_ingredient
  after delete on recipe_ingredients
  for each row
  execute function cleanup_orphaned_ingredient();

-- ============ HILFSMITTEL (Stammdaten, geteilter Pool wie Zutaten) ============
create table if not exists tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- ============ REZEPT-HILFSMITTEL (Verknüpfung, kein Mengenfeld nötig) ============
create table if not exists recipe_tools (
  recipe_id uuid references recipes(id) on delete cascade,
  tool_id uuid references tools(id) on delete cascade,
  primary key (recipe_id, tool_id)
);

-- ============ ZUBEREITUNGSSCHRITTE ============
create table if not exists recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade not null,
  reihenfolge integer not null,
  text text not null
);

-- ============ Row Level Security (jeder sieht nur eigene Rezepte) ============
alter table recipes enable row level security;
alter table recipe_tags enable row level security;
alter table recipe_ingredients enable row level security;
alter table recipe_steps enable row level security;

create policy "Eigene Rezepte lesen" on recipes
  for select using (auth.uid() = owner_id);
create policy "Eigene Rezepte anlegen" on recipes
  for insert with check (auth.uid() = owner_id);
create policy "Eigene Rezepte bearbeiten" on recipes
  for update using (auth.uid() = owner_id);
create policy "Eigene Rezepte löschen" on recipes
  for delete using (auth.uid() = owner_id);

create policy "Tags über eigenes Rezept" on recipe_tags
  for all using (
    exists (select 1 from recipes where recipes.id = recipe_tags.recipe_id and recipes.owner_id = auth.uid())
  );

create policy "Zutaten-Verknüpfung über eigenes Rezept" on recipe_ingredients
  for all using (
    exists (select 1 from recipes where recipes.id = recipe_ingredients.recipe_id and recipes.owner_id = auth.uid())
  );

create policy "Schritte über eigenes Rezept" on recipe_steps
  for all using (
    exists (select 1 from recipes where recipes.id = recipe_steps.recipe_id and recipes.owner_id = auth.uid())
  );

-- Zutaten-Stammdaten sind bewusst NICHT durch RLS eingeschränkt —
-- alle Nutzer:innen teilen sich denselben Zutaten-Pool (z.B. "Tomate" existiert nur einmal).
alter table ingredients enable row level security;
create policy "Zutaten für alle lesbar" on ingredients
  for select using (true);
create policy "Eingeloggte Nutzer können Zutaten anlegen" on ingredients
  for insert with check (auth.role() = 'authenticated');
create policy "Eingeloggte Nutzer können Zutaten bearbeiten" on ingredients
  for update using (auth.role() = 'authenticated');
create policy "Eingeloggte Nutzer können Zutaten löschen" on ingredients
  for delete using (auth.role() = 'authenticated');

-- Hilfsmittel sind wie Zutaten ein geteilter Pool.
alter table tools enable row level security;
create policy "Hilfsmittel für alle lesbar" on tools
  for select using (true);
create policy "Eingeloggte Nutzer können Hilfsmittel anlegen" on tools
  for insert with check (auth.role() = 'authenticated');
create policy "Eingeloggte Nutzer können Hilfsmittel bearbeiten" on tools
  for update using (auth.role() = 'authenticated');
create policy "Eingeloggte Nutzer können Hilfsmittel löschen" on tools
  for delete using (auth.role() = 'authenticated');

alter table recipe_tools enable row level security;
create policy "Hilfsmittel-Verknüpfung über eigenes Rezept" on recipe_tools
  for all using (
    exists (select 1 from recipes where recipes.id = recipe_tools.recipe_id and recipes.owner_id = auth.uid())
  );

-- Profile: jede:r sieht das eigene, Admins sehen alle. Nur Admins dürfen Profile ändern
-- (also Admin-Rechte vergeben/entziehen).
alter table profiles enable row level security;
create policy "Eigenes Profil oder alle als Admin lesen" on profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "Nur Admins können Profile bearbeiten" on profiles
  for update using (public.is_admin());

-- Zutaten-Kategorien: alle dürfen lesen (z.B. für die Auswahl-Box im Formular),
-- nur Admins dürfen die Liste selbst pflegen.
alter table ingredient_categories enable row level security;
create policy "Zutaten-Kategorien für alle lesbar" on ingredient_categories
  for select using (true);
create policy "Nur Admins können Zutaten-Kategorien anlegen" on ingredient_categories
  for insert with check (public.is_admin());
create policy "Nur Admins können Zutaten-Kategorien bearbeiten" on ingredient_categories
  for update using (public.is_admin());
create policy "Nur Admins können Zutaten-Kategorien löschen" on ingredient_categories
  for delete using (public.is_admin());

-- Autor:innen sind ebenfalls ein geteilter Pool, genau wie Zutaten.
alter table authors enable row level security;
create policy "Autor:innen für alle lesbar" on authors
  for select using (true);
create policy "Eingeloggte Nutzer können Autor:innen anlegen" on authors
  for insert with check (auth.role() = 'authenticated');

-- Kochbücher gehören jeweils einer Nutzer:in (eigene Verwaltung, siehe Sidebar).
alter table cookbooks enable row level security;
create policy "Eigene Kochbücher lesen" on cookbooks
  for select using (auth.uid() = owner_id);
create policy "Eigene Kochbücher anlegen" on cookbooks
  for insert with check (auth.uid() = owner_id);
create policy "Eigene Kochbücher bearbeiten" on cookbooks
  for update using (auth.uid() = owner_id);
create policy "Eigene Kochbücher löschen" on cookbooks
  for delete using (auth.uid() = owner_id);

-- Sammlungen gehören ebenfalls jeweils einer Nutzer:in.
alter table collections enable row level security;
create policy "Eigene Sammlungen lesen" on collections
  for select using (auth.uid() = owner_id);
create policy "Eigene Sammlungen anlegen" on collections
  for insert with check (auth.uid() = owner_id);
create policy "Eigene Sammlungen bearbeiten" on collections
  for update using (auth.uid() = owner_id);
create policy "Eigene Sammlungen löschen" on collections
  for delete using (auth.uid() = owner_id);

alter table recipe_collections enable row level security;
create policy "Sammlung-Verknüpfung über eigenes Rezept" on recipe_collections
  for all using (
    exists (select 1 from recipes where recipes.id = recipe_collections.recipe_id and recipes.owner_id = auth.uid())
  );

-- Kategorien gehören jeweils einer Nutzer:in (eigene Verwaltung, siehe Sidebar).
alter table categories enable row level security;
create policy "Eigene Kategorien lesen" on categories
  for select using (auth.uid() = owner_id);
create policy "Eigene Kategorien anlegen" on categories
  for insert with check (auth.uid() = owner_id);
create policy "Eigene Kategorien bearbeiten" on categories
  for update using (auth.uid() = owner_id);
create policy "Eigene Kategorien löschen" on categories
  for delete using (auth.uid() = owner_id);

-- Tags gehören jeweils einer Nutzer:in (eigene Verwaltung, siehe Sidebar).
alter table tags enable row level security;
create policy "Eigene Tags lesen" on tags
  for select using (auth.uid() = owner_id);
create policy "Eigene Tags anlegen" on tags
  for insert with check (auth.uid() = owner_id);
create policy "Eigene Tags bearbeiten" on tags
  for update using (auth.uid() = owner_id);
create policy "Eigene Tags löschen" on tags
  for delete using (auth.uid() = owner_id);

-- ============ Storage: Bucket für Rezeptbilder ============
-- Erstellt einen öffentlich lesbaren Bucket für hochgeladene Rezeptbilder.
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

-- Jeder darf Bilder ansehen (der Bucket ist ohnehin public)
create policy "Rezeptbilder öffentlich lesbar"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

-- Nur eingeloggte Nutzer dürfen Bilder hochladen
create policy "Eingeloggte Nutzer können Rezeptbilder hochladen"
  on storage.objects for insert
  with check (bucket_id = 'recipe-images' and auth.role() = 'authenticated');

-- Nur der/die Hochlader:in darf das eigene Bild wieder löschen/ersetzen
create policy "Eigene Rezeptbilder löschen"
  on storage.objects for delete
  using (bucket_id = 'recipe-images' and auth.uid() = owner);

create policy "Eigene Rezeptbilder ersetzen"
  on storage.objects for update
  using (bucket_id = 'recipe-images' and auth.uid() = owner);

-- ============ User-Feedback-Backlog ============
-- Speichert Nachrichten aus dem "Kontaktieren"-Formular (zusätzlich zum E-Mail-Versand) sowie
-- Einträge, die Admins direkt selbst anlegen. Siehe migration-user-feedback.sql.
create table if not exists public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Feature Request', 'Report a Bug', 'Feedback', 'Sonstiges')),
  message text not null,
  status text not null default 'offen' check (status in ('offen', 'abgearbeitet', 'abgelehnt')),
  source text not null default 'user' check (source in ('user', 'admin')),
  created_by uuid references auth.users(id) on delete set null,
  sender_email text,
  created_at timestamptz not null default now()
);

alter table public.feedback_items enable row level security;

create policy "feedback_items: insert own" on public.feedback_items
  for insert to authenticated
  with check (auth.uid() = created_by);

create policy "feedback_items: select admin" on public.feedback_items
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "feedback_items: update admin" on public.feedback_items
  for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "feedback_items: delete admin" on public.feedback_items
  for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ============ Einkaufsliste (v0.46) ============
-- Für bestehende Datenbanken: siehe migration-einkaufsliste.sql.

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
