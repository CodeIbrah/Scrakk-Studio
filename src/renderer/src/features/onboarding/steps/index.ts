// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Pasos builtin de la configuración inicial.
 *
 * Este archivo es el ÚNICO que conoce el orden y el catálogo completo: cada
 * paso vive en su carpeta, sabe pintarse solo y declara si es real o fake.
 * Agregar un paso = crear el componente y sumar una entrada aquí; el wizard
 * no cambia (se re-ordena solo por `order`).
 *
 * Fake = maqueta con datos de mentira, SIN servicios reales (tests/onboarding
 * .test.ts lee los imports de `steps/fake/**` y falla si alguno toca un
 * servicio). Real = aplica de verdad lo que el usuario elige.
 */

import { registerOnboardingStep } from '../registry'
import type { OnboardingStep } from '../types'
import { KeymapStep } from './fake/KeymapStep'
import { ReadyStep } from './fake/ReadyStep'
import { WelcomeStep } from './fake/WelcomeStep'
import { PrivacyStep } from './real/PrivacyStep'
import { ThemeStep } from './real/ThemeStep'

import { t } from '@core/i18n'
/** Catálogo de pasos, en orden de aparición. */
export const BUILTIN_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    get label() { return t('onboarding.bienvenida') },
    get title() { return t('onboarding.bienvenido.a.scrakk.studio') },
    get subtitle() { return t('onboarding.un.editor.con.layout.libre') },
    icon: 'home',
    kind: 'fake',
    order: 10,
    component: WelcomeStep
  },
  {
    id: 'theme',
    get label() { return t('onboarding.apariencia') },
    get title() { return t('onboarding.elige.como.se.ve') },
    get subtitle() { return t('onboarding.los.temas.se.aplican.al') },
    icon: 'grid',
    kind: 'real',
    order: 20,
    component: ThemeStep
  },
  {
    id: 'privacy',
    get label() { return t('onboarding.privacidad') },
    get title() { return t('onboarding.tu.decides.que.se.comparte') },
    get subtitle() { return t('onboarding.una.sola.vez.sin.insistir') },
    icon: 'shield-check',
    kind: 'real',
    order: 30,
    component: PrivacyStep
  },
  {
    id: 'keymap',
    get label() { return t('onboarding.atajos') },
    get title() { return t('onboarding.atajos.a.tu.manera') },
    get subtitle() { return t('onboarding.si.vienes.de.otro.editor') },
    icon: 'keyboard',
    kind: 'fake',
    order: 40,
    component: KeymapStep
  },
  {
    id: 'ready',
    get label() { return t('onboarding.listo') },
    get title() { return t('onboarding.todo.listo') },
    get subtitle() { return t('onboarding.revisa.lo.elegido.o.empieza') },
    icon: 'check',
    kind: 'fake',
    order: 50,
    component: ReadyStep
  }
]

let registered = false

/** Idempotente: registra el catálogo builtin una sola vez. */
export function registerBuiltinOnboardingSteps(): void {
  if (registered) return
  registered = true
  for (const step of BUILTIN_ONBOARDING_STEPS) registerOnboardingStep(step)
}

registerBuiltinOnboardingSteps()
