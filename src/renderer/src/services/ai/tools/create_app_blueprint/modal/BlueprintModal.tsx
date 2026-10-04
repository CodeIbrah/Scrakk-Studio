// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `create_app_blueprint`: nombre, features, layout y
 * stack del blueprint.
 */

import type { JSX } from 'react'
import {
  ToolModalEmpty,
  ToolModalList,
  ToolModalMeta,
  ToolModalRow,
  ToolModalSection,
  ToolModalText,
  type ToolModalContext
} from '@services/ai/tool-shell'
import { t } from '@core/i18n'

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : []
}

export function BlueprintModal({ args, status }: ToolModalContext): JSX.Element {
  const name = typeof args.name === 'string' ? args.name : ''
  const features = asStringArray(args.features)
  const layout = typeof args.layout === 'string' ? args.layout : ''
  const stack = (args.stack ?? {}) as { languages?: unknown; technologies?: unknown }
  const languages = asStringArray(stack.languages)
  const technologies = asStringArray(stack.technologies)
  const running = status === 'running' || status === 'streaming' || status === 'pending'

  if (!name && features.length === 0 && !layout) {
    return (
      <ToolModalEmpty>
        {running ? t('chat.tool.todavia.corriendo') : t('chat.tool.sin.salida')}
      </ToolModalEmpty>
    )
  }

  return (
    <>
      <ToolModalMeta items={[{ label: t('chat.tool.titulo'), value: name || '—' }]} />

      {features.length > 0 ? (
        <ToolModalSection title={t('chat.tool.detalles')}>
          <ToolModalList>
            {features.map((feature, index) => (
              <ToolModalRow key={index} icon="check" title={feature} />
            ))}
          </ToolModalList>
        </ToolModalSection>
      ) : null}

      {(languages.length > 0 || technologies.length > 0) && (
        <ToolModalMeta
          items={[
            ...(languages.length > 0
              ? [{ label: 'languages', value: languages.join(', ') }]
              : []),
            ...(technologies.length > 0
              ? [{ label: 'technologies', value: technologies.join(', ') }]
              : [])
          ]}
        />
      )}

      {layout ? (
        <ToolModalSection title={t('chat.tool.descripcion')}>
          <ToolModalText>{layout}</ToolModalText>
        </ToolModalSection>
      ) : null}
    </>
  )
}
