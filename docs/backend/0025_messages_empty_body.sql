-- Copyright 2026 Scrakk Studio
-- SPDX-License-Identifier: Apache-2.0
-- Licencia completa en LICENSE (Apache License 2.0).

-- 0025: un mensaje puede tener el body VACÍO si manda solo adjuntos.
-- Proyecto: scrakk-cli (Supabase)
--
-- SÍNTOMA: al mandar una foto por el chat Social, además de la imagen aparecía
-- un emoji 📷 como texto del mensaje.
--
-- CAUSA: `messages_body_check` exigía `char_length(body) >= 1`, y el INSERT del
-- cliente no puede dejar el body vacío. Para poder mandar una foto sin texto,
-- `sendMessage` rellenaba el body con `'📷'`:
--
--     const text = body.trim() || (attachments.length > 0 ? '📷' : '')
--
-- Ese carácter es DATA real (viajaba, se guardaba y se pintaba como texto), no
-- un detalle de presentación.
--
-- FIX: se permite el body vacío en los mensajes `normal`. Los `codefile` siguen
-- obligados: `messages_codefile_body_check` ya exige que lleven un sobre JSON
-- válido con `name`, así que relajar este CHECK no los afecta.
--
-- Nota: un CHECK no puede mirar `message_attachments` (otra tabla, y además la
-- fila se inserta DESPUÉS del mensaje), así que la regla "o texto o adjuntos"
-- se valida en la app (`sendMessage`): body vacío Y sin adjuntos → se rechaza.

alter table public.messages
  drop constraint if exists messages_body_check;

alter table public.messages
  add constraint messages_body_check
  check (
    char_length(body) <= 4000
    and (kind = 'normal' or char_length(body) >= 1)
  );

-- Verificación:
--   insert de un mensaje `normal` con body '' → debe pasar.
--   insert de un `codefile` con body '' → debe fallar (sigue exigiendo el sobre).