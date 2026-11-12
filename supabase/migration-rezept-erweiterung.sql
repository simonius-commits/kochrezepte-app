-- ============ Rezept-Erweiterung (v0.50, Vorbereitung Mela-Import) ============
-- Einmal im Supabase SQL Editor ausführen (SQL Editor → New query → einfügen → Run).
-- Ist auch in schema.sql enthalten; dieses Skript ist nur für bestehende Datenbanken.
-- Kann gefahrlos mehrfach ausgeführt werden. Es kommen nur Felder/Tabellen DAZU,
-- nichts wird gelöscht.

-- ---------- 1) Neue Felder am Rezept ----------
alter table recipes add column if not exists notizen text;              -- eigene Notizen zum Rezept
alter table recipes add column if not exists naehrwerte_text text;      -- Nährwerte als Originaltext (z.B. aus Mela)
alter table recipes add column if not exists portionen_text text;       -- z.B. "1 Kuchen (26 cm)"; Zahl bleibt in portionen_standard
alter table recipes add column if not exists gesamtzeit_min integer;    -- inkl. Ruhe-/Backzeit
alter table recipes add column if not exists favorit boolean not null default false;
alter table recipes add column if not exists will_kochen boolean not null default false;  -- „Möchte ich kochen“
alter table recipes add column if not exists import_quelle text;        -- z.B. "mela"
alter table recipes add column if not exists import_id text;            -- Kennung in der Quell-App

-- Dasselbe Rezept aus derselben Quelle höchstens einmal pro Person
create unique index if not exists recipes_import_unique
  on recipes (owner_id, import_quelle, import_id)
  where import_id is not null;

-- ---------- 2) Mehrere Bilder pro Rezept ----------
-- Reihenfolge 0 = Titelbild. recipes.bild_url bleibt als Kopie des Titelbilds erhalten, damit
-- Cards und Listen ohne Extra-Abfrage auskommen (wird beim Speichern automatisch gesetzt).
create table if not exists recipe_images (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade not null,
  url text not null,
  reihenfolge integer not null default 0,
  created_at timestamptz default now()
);

alter table recipe_images enable row level security;
drop policy if exists "Bilder über eigenes Rezept" on recipe_images;
create policy "Bilder über eigenes Rezept" on recipe_images
  for all using (
    exists (select 1 from recipes where recipes.id = recipe_images.recipe_id and recipes.owner_id = auth.uid())
  );

-- Vorhandene Bilder umziehen (nur Rezepte, die noch kein Bild in recipe_images haben)
insert into recipe_images (recipe_id, url, reihenfolge)
select r.id, r.bild_url, 0
from recipes r
where r.bild_url is not null and r.bild_url <> ''
  and not exists (select 1 from recipe_images ri where ri.recipe_id = r.id);

-- ---------- 3) Zutaten: Reihenfolge + Gruppe ----------
alter table recipe_ingredients add column if not exists reihenfolge integer;
alter table recipe_ingredients add column if not exists gruppe text;   -- z.B. "Für die Soße"

-- Vorhandene Zutaten in der bisherigen (Einfüge-)Reihenfolge durchnummerieren
update recipe_ingredients ri set reihenfolge = n.nr
from (
  select id, row_number() over (partition by recipe_id order by ctid) as nr
  from recipe_ingredients
) n
where ri.id = n.id and ri.reihenfolge is null;

-- ---------- 4) Schritte: Gruppe ----------
alter table recipe_steps add column if not exists gruppe text;         -- z.B. "Teig"
