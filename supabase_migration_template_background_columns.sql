-- ==========================================================================
-- Adds the background_image_url / background_color columns to `templates`.
-- ==========================================================================
--
-- WHY THIS EXISTS
-- ----------------
-- TemplateEditor.tsx (the "Estrutura Automatizada" screen) lets you set a
-- solid background color or a background image for a template, and the
-- client code (TemplateService.ts) already reads/writes
-- `background_image_url` / `background_color` on every save/load — but the
-- `templates` table never had these columns, so every save silently
-- dropped them the next time templates were re-synced from the database
-- (which happens after nearly every action in the app). The setting would
-- appear to work in the moment, then quietly revert.
--
-- HOW TO APPLY
-- ------------
-- 1. Open the Supabase dashboard -> SQL Editor for this project.
-- 2. Paste and run this entire file. Safe to re-run (IF NOT EXISTS).
--
-- ==========================================================================

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS background_image_url text,
  ADD COLUMN IF NOT EXISTS background_color text;
