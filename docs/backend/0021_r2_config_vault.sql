-- Copyright 2026 Scrakk Studio
-- SPDX-License-Identifier: Apache-2.0
-- Licencia completa en LICENSE (Apache License 2.0).

-- 0021: config de R2 para la Edge Function `social-file`, leída de Vault.
-- Proyecto: scrakk-cli (Supabase)
--
-- Las credenciales viven en Supabase Vault (nunca en el repo ni en secrets de
-- la función). Esta función SECURITY DEFINER las expone SOLO al `service_role`,
-- que es el único rol que puede ejecutarla: `anon` y `authenticated` quedan
-- revocados. Sin esto, cualquiera con la anon key podría leer las credenciales.
--
-- Los secretos se cargan aparte (no van en este archivo):
--   select vault.create_secret('<valor>', 'scrakk_r2_endpoint',        '...');
--   select vault.create_secret('<valor>', 'scrakk_r2_access_key',      '...');
--   select vault.create_secret('<valor>', 'scrakk_r2_secret_key',      '...');
--   select vault.create_secret('scrakk-chat-files', 'scrakk_r2_bucket_files', '...');

create or replace function public.get_r2_config()
returns jsonb
language sql
security definer
set search_path = ''
as $fn$
  select jsonb_build_object(
    'endpoint', (select decrypted_secret from vault.decrypted_secrets where name = 'scrakk_r2_endpoint'),
    'accessKey', (select decrypted_secret from vault.decrypted_secrets where name = 'scrakk_r2_access_key'),
    'secretKey', (select decrypted_secret from vault.decrypted_secrets where name = 'scrakk_r2_secret_key'),
    'bucket', (select decrypted_secret from vault.decrypted_secrets where name = 'scrakk_r2_bucket_files')
  );
$fn$;

revoke all on function public.get_r2_config() from public;
revoke all on function public.get_r2_config() from anon;
revoke all on function public.get_r2_config() from authenticated;
grant execute on function public.get_r2_config() to service_role;
