// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `multiple_tools`: la secuencia de tools que se ejecutó,
 * con sus argumentos resumidos.
 */

import type { JSX } from 'react'
import {
  TOOL_PRODUCT_ICON_IDS,
  ToolModalEmpty,
  ToolModalList,
  ToolModalMeta,
  ToolModalRow,
  ToolModalSection,
  ToolModalText,
  type ToolModalContext
} from '@services/ai/tool-shell'
import { t } from '@core/i18n'

interface ToolCallSpec {
  toolName: string
  args: Record<string, unknown>
}

function parseTools(args: Record<string, unknown>): ToolCallSpec[] {
  const raw = args.tools
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => entry as { tool_name?: string; arguments?: Record<string, unknown> })
    .filter((entry) => typeof entry.tool_name === 'string')
    .map((entry) => ({
      toolName: entry.tool_name as string,
      args: entry.arguments && typeof entry.arguments === 'object' ? entry.arguments : {}
    }))
}

function summarize(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' · ')
}

export function MultipleToolsModal({ args, result, status }: ToolModalContext): JSX.Element {
  const tools = parseTools(args)
  const running = status === 'running' || status === 'streaming' || status === 'pending'

  if (tools.length === 0) {
    return <ToolModalEmpty>{t('chat.tool.sin.salida')}</ToolModalEmpty>
  }

  return (
    <>
      <ToolModalMeta
        items={[{ label: t('chat.tool.herramientas'), value: String(tools.length) }]}
      />
      <ToolModalSection>
        <ToolModalList>
          {tools.map((tool, index) => (
            <ToolModalRow
              key={`${tool.toolName}-${index}`}
              icon={TOOL_PRODUCT_ICON_IDS[tool.toolName] ?? 'box'}
              title={tool.toolName}
              detail={summarize(tool.args) || undefined}
              meta={String(index + 1)}
              monospace
            />
          ))}
        </ToolModalList>
      </ToolModalSection>
      <ToolModalSection title={t('chat.tool.salida')}>
        {result ? (
          <ToolModalText>{result}</ToolModalText>
        ) : (
          <ToolModalEmpty>
            {running ? t('chat.tool.todavia.corriendo') : t('chat.tool.sin.salida')}
          </ToolModalEmpty>
        )}
      </ToolModalSection>
    </>
  )
}
