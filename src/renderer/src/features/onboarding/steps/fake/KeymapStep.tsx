// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Paso 4 — Atajos. FAKE: solo UI.
 *
 * Los cuatro perfiles y sus combinaciones son de mentira: sirven para ver
 * cómo va a quedar el selector cuando el motor de keymaps exista. La
 * elección NO se persiste (guardar algo que nada consume sería mentir) y el
 * paso lo dice con una nota.
 *
 * Cuando pase a real: importar el servicio de keymaps y reemplazar el
 * `setChoice` local por la aplicación real. Nada más cambia.
 */

import { useEffect, type JSX } from 'react'
import type { StepContext } from '../../types'
import {
  CardGrid,
  OptionCard,
  PreviewNote,
  SectionLabel,
  ShortcutList,
  ShortcutRow,
  Stack
} from '../kit'

import { t } from '@core/i18n'
/** Perfil que arranca marcado (el actual del editor). */
const DEFAULT_PROFILE_ID = 'scrakk'

interface DemoShortcut {
  action: string
  keys: string[]
}

interface DemoProfile {
  id: string
  title: string
  description: string
  badge?: string
  shortcuts: DemoShortcut[]
}

/** Perfiles DEMO (maqueta). */
const DEMO_PROFILES: DemoProfile[] = [
  {
    id: 'scrakk',
    get title() { return t('onboarding.scrakk') },
    get description() { return t('onboarding.los.atajos.del.editor.tal') },
    badge: 'Actual',
    shortcuts: [
      { get action() { return t('onboarding.paleta.de.comandos') }, keys: [t('onboarding.ctrl'), t('onboarding.shift'), 'P'] },
      { get action() { return t('onboarding.buscar.archivo') }, keys: [t('onboarding.ctrl'), 'P'] },
      { action: 'Guardar', keys: [t('onboarding.ctrl'), 'S'] },
      { action: 'Terminal', keys: [t('onboarding.ctrl'), 'Ñ'] }
    ]
  },
  {
    id: 'vscode',
    get title() { return t('onboarding.vs.code') },
    get description() { return t('onboarding.los.mismos.atajos.que.ya') },
    shortcuts: [
      { get action() { return t('onboarding.paleta.de.comandos') }, keys: [t('onboarding.ctrl'), t('onboarding.shift'), 'P'] },
      { get action() { return t('onboarding.buscar.archivo') }, keys: [t('onboarding.ctrl'), 'P'] },
      { action: 'Guardar', keys: [t('onboarding.ctrl'), 'S'] },
      { action: 'Terminal', keys: [t('onboarding.ctrl'), '`'] }
    ]
  },
  {
    id: 'jetbrains',
    title: 'JetBrains',
    get description() { return t('onboarding.esquema.de.intellij.webstorm') },
    shortcuts: [
      { get action() { return t('onboarding.buscar.accion') }, keys: [t('onboarding.ctrl'), t('onboarding.shift'), 'A'] },
      { get action() { return t('onboarding.buscar.archivo') }, keys: [t('onboarding.ctrl'), t('onboarding.shift'), 'N'] },
      { action: 'Guardar', keys: [t('onboarding.ctrl'), 'S'] },
      { action: 'Terminal', keys: [t('onboarding.alt'), 'F12'] }
    ]
  },
  {
    id: 'vim',
    get title() { return t('onboarding.vim') },
    get description() { return t('onboarding.modo.normal.para.los.que') },
    shortcuts: [
      { get action() { return t('onboarding.paleta.de.comandos') }, keys: [t('onboarding.ctrl'), t('onboarding.shift'), 'P'] },
      { get action() { return t('onboarding.buscar.en.archivo') }, keys: ['/'] },
      { action: 'Guardar', keys: [t('onboarding.ctrl'), 'S'] },
      { get action() { return t('onboarding.salir.del.modo') }, keys: [t('onboarding.esc')] }
    ]
  }
]

export function KeymapStep({ choice, setChoice }: StepContext): JSX.Element {
  // La elección guarda el TÍTULO (el wizard lo muestra tal cual en el
  // resumen); el perfil se resuelve por título.
  const selected =
    DEMO_PROFILES.find((profile) => profile.title === choice) ??
    DEMO_PROFILES.find((profile) => profile.id === DEFAULT_PROFILE_ID) ??
    DEMO_PROFILES[0]

  // Preselección: el perfil actual, para que el resumen tenga algo que decir.
  useEffect(() => {
    if (choice === null) setChoice(selected.title)
  }, [choice, selected.title, setChoice])

  return (
    <Stack gap={4}>
      <Stack gap={3}>
        <SectionLabel>{t('onboarding.perfil.de.atajos')}</SectionLabel>
        <CardGrid>
          {DEMO_PROFILES.map((profile) => (
            <OptionCard
              key={profile.id}
              icon="keyboard"
              title={profile.title}
              description={profile.description}
              badge={profile.badge}
              selected={profile.id === selected.id}
              onSelect={() => setChoice(profile.title)}
            />
          ))}
        </CardGrid>
      </Stack>

      <Stack gap={3}>
        <SectionLabel>{t('onboarding.asi.quedaria')}{selected.title}»</SectionLabel>
        <ShortcutList>
          {selected.shortcuts.map((shortcut) => (
            <ShortcutRow key={shortcut.action} action={shortcut.action} keys={shortcut.keys} />
          ))}
        </ShortcutList>
      </Stack>

      <PreviewNote>
        {t('onboarding.los.perfiles.de.atajos.son')}
      </PreviewNote>
    </Stack>
  )
}
