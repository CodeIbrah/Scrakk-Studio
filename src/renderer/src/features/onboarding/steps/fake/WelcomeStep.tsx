// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Paso 1 — Bienvenida. FAKE: no toca ningún servicio.
 *
 * Los datos son de mentira (a propósito): sirven para ver la pantalla real
 * con contenido verosímil antes de que exista la fuente que los llene.
 * Cuando el paso pase a real se le inyecta un origen de datos; la forma del
 * componente no cambia.
 */

import type { JSX } from 'react'
import { CardGrid, Lead, OptionCard, SectionLabel, Stack } from '../kit'

import { t } from '@core/i18n'
/** Datos DEMO de este paso (maqueta). */
const DEMO_SESSION = {
  greeting: 'Hola 👋',
  get line() { return t('onboarding.tu.editor.ya.esta.listo') },
  highlights: [
    {
      id: 'editor',
      icon: 'code',
      get title() { return t('onboarding.editor.con.innerta') },
      get description() { return t('onboarding.resaltado.minimapa.y.simbolos.sobre') }
    },
    {
      id: 'terminal',
      icon: 'terminal',
      get title() { return t('onboarding.terminal.real') },
      get description() { return t('onboarding.pty.nativo.con.sesiones.persistentes') }
    },
    {
      id: 'extensions',
      icon: 'extensions',
      get title() { return t('onboarding.extensiones') },
      get description() { return t('onboarding.temas.paneles.y.compatibilidad.con') }
    },
    {
      id: 'workspaces',
      icon: 'layers',
      get title() { return t('onboarding.layout.libre') },
      get description() { return t('onboarding.cada.panel.se.mueve.se') }
    }
  ]
} as const

export function WelcomeStep(): JSX.Element {
  return (
    <Stack gap={4}>
      <Stack gap={3}>
        <SectionLabel>{DEMO_SESSION.greeting}</SectionLabel>
        <Lead>{DEMO_SESSION.line}</Lead>
      </Stack>
      <CardGrid>
        {DEMO_SESSION.highlights.map((item) => (
          <OptionCard key={item.id} icon={item.icon} title={item.title} description={item.description} />
        ))}
      </CardGrid>
    </Stack>
  )
}
