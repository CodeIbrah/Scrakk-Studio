-- Copyright 2026 Scrakk Studio
-- SPDX-License-Identifier: Apache-2.0
-- Licencia completa en LICENSE (Apache License 2.0).

-- 0023: autorización de Realtime para el canal de "typing".
-- Proyecto: scrakk-cli (Supabase)
--
-- El indicador de "está escribiendo" usa un canal `broadcast` (`typing:<uid>`,
-- ver `watchAccount` en src/main/social/service.ts). Con "Realtime
-- Authorization" (RLS sobre `realtime.messages`) habilitado —que es el default
-- en los proyectos nuevos— un `broadcast` sin políticas NO se entrega: el
-- `.subscribe()` resuelve bien y el evento nunca llega, sin error visible.
--
-- Por eso el typing era un acierto/mismo fallo silencioso. Estas políticas lo
-- cierran:
--
--   - INSERT (enviar): sólo al canal de un amigo propio.
--   - SELECT  (recibir): sólo a MI canal (así nadie puede escuchar el de otro).
--
-- Nota: los canales `postgres_changes` (messages, presence, friendships…) NO
-- pasan por `realtime.messages`; usan la RLS de las tablas del public schema,
-- que ya está definida en 0010/0013/0014. Esta migración no los toca.

-- Nota: NO se hace `alter table realtime.messages enable row level security`
-- porque esa tabla es de supabase_admin y da `must be owner of table messages`.
-- En este proyecto la RLS ya estaba activa (verificado) y las políticas de abajo
-- son lo que hace falta.

-- Enviar "typing" al canal del otro.
drop policy if exists "typing send to friend channel" on "realtime"."messages";
create policy "typing send to friend channel"
  on "realtime"."messages"
  for insert
  to authenticated
  with check (
    realtime.topic() like 'typing:%'
    and public.are_friends((select auth.uid()), (split_part(realtime.topic(), ':', 2))::uuid)
  );

-- Escuchar MI propio canal de typing.
drop policy if exists "typing read own channel" on "realtime"."messages";
create policy "typing read own channel"
  on "realtime"."messages"
  for select
  to authenticated
  using (realtime.topic() = 'typing:' || (select auth.uid())::text);