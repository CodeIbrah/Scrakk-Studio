-- Copyright 2026 Scrakk Studio
-- SPDX-License-Identifier: Apache-2.0
-- Licencia completa en LICENSE (Apache License 2.0).

-- 0022: un mensaje 'codefile' debe traer un sobre válido.
-- Proyecto: scrakk-cli (Supabase)
--
-- El sobre es JSON de una línea con los metadatos + la key de R2 (ver
-- `src/shared/socialCodeFile.ts`). Sin esto, cualquiera con SQL directo podía
-- insertar un 'codefile' basura (o apuntando a una key arbitraria) y romper el
-- render del cliente.
--
-- `is_codefile_body` atrapa el JSON inválido para que el cast `::jsonb` del
-- CHECK no tire error: devuelve false en vez de reventar.

create or replace function public.is_codefile_body(body text)
returns boolean
language plpgsql
immutable
as $fn$
begin
  if body is null or left(body, 1) <> '{' then return false; end if;
  if jsonb_typeof(body::jsonb) <> 'object' then return false; end if;
  return true;
exception when others then
  -- JSON inválido: no es un sobre.
  return false;
end $fn$;

revoke all on function public.is_codefile_body(text) from public;
revoke all on function public.is_codefile_body(text) from anon;
revoke all on function public.is_codefile_body(text) from authenticated;

alter table public.messages
  drop constraint if exists messages_codefile_body_check;
alter table public.messages
  add constraint messages_codefile_body_check check (
    kind <> 'codefile'
    or (
      public.is_codefile_body(body)
      and (body::jsonb->>'v') = '1'
      and (body::jsonb->>'kind') = 'codefile'
      and char_length(coalesce(body::jsonb->>'name', '')) between 1 and 255
      and char_length(coalesce(body::jsonb->>'key', '')) between 1 and 512
      and position('..' in coalesce(body::jsonb->>'key', '')) = 0
    )
  );
