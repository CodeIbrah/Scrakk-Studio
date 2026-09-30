-- Copyright 2026 Scrakk Studio
-- SPDX-License-Identifier: Apache-2.0
-- Licencia completa en LICENSE (Apache License 2.0).

-- 0020: tipo de mensaje — normal (texto) o codefile (archivo compartido).
-- Proyecto: scrakk-cli (Supabase)
--
-- `kind` clasifica el mensaje. Los `codefile` llevan un sobre con metadatos +
-- la key del objeto en R2; los `normal` son texto plano (cap de 4000 chars,
-- sin cambios). No se toca el CHECK del body: el sobre de un codefile entra
-- en 4000.

alter table public.messages
  add column if not exists kind text not null default 'normal';

alter table public.messages
  drop constraint if exists messages_kind_check;
alter table public.messages
  add constraint messages_kind_check check (kind in ('normal','codefile'));
