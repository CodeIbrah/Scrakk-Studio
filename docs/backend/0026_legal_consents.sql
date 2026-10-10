-- Copyright 2026 Scrakk Studio
-- SPDX-License-Identifier: Apache-2.0
-- Licencia completa en LICENSE (Apache License 2.0).

-- 0026: aceptación de términos por cuenta (Terms + Privacy).
-- Proyecto: scrakk-cli (Supabase)
-- Aplicada vía MCP de Supabase (queda en supabase_migrations.schema_migrations).
--
-- El IDE (y cualquier cliente del servicio) registra la aceptación POR CUENTA:
-- versión aceptada, idioma y la marca de tiempo la pone el SERVER (`now()`),
-- así la prueba no depende del reloj del cliente.

alter table public.profiles
  add column if not exists legal_version text,
  add column if not exists legal_accepted_at timestamptz,
  add column if not exists legal_locale text;

-- Registra (o renueva) la aceptación de la cuenta autenticada.
create or replace function public.accept_legal(p_version text, p_locale text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_version is null or length(trim(p_version)) = 0 then
    raise exception 'legal_version_requerida';
  end if;
  update public.profiles
     set legal_version = p_version,
         legal_accepted_at = now(),
         legal_locale = p_locale
   where id = auth.uid();
end;
$$;

-- RLS: el dueño ya puede UPDATE su propia fila (ver 0004/0006). Esta función
-- no agrega permisos; solo centraliza la marca de tiempo del servidor.
