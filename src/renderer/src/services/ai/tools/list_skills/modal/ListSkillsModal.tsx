// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `list_skills`: nombre, descripción y origen de cada
 * skill habilitada.
 */

import type { JSX } from 'react'
import {
  ToolModalEmpty,
  ToolModalList,
  ToolModalMeta,
  ToolModalRow,
  ToolModalSection,
  type ToolModalContext
} from '@services/ai/tool-shell'
import { t } from '@core/i18n'

interface SkillEntry {
  name: string
  description?: string
  source?: string
}

function parseSkills(result?: string): SkillEntry[] {
  if (!result) return []
  try {
    const parsed = JSON.parse(result) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((raw) => raw as { name?: string; description?: string; source?: string })
      .filter((raw) => typeof raw.name === 'string')
      .map((raw) => ({
        name: raw.name as string,
        description: typeof raw.description === 'string' ? raw.description : undefined,
        source: typeof raw.source === 'string' ? raw.source : undefined
      }))
  } catch {
    return []
  }
}

export function ListSkillsModal({ result, status }: ToolModalContext): JSX.Element {
  const running = status === 'running' || status === 'streaming' || status === 'pending'
  if (running && !result) {
    return <ToolModalEmpty>{t('chat.tool.todavia.corriendo')}</ToolModalEmpty>
  }

  const skills = parseSkills(result)
  if (skills.length === 0) {
    const raw = result?.trim() ?? ''
    const looksJson = raw.startsWith('[') || raw.startsWith('{')
    return (
      <ToolModalEmpty>
        {raw && !looksJson ? raw : t('chat.tool.sin.resultados')}
      </ToolModalEmpty>
    )
  }

  return (
    <>
      <ToolModalMeta
        items={[{ label: t('chat.tool.habilidades'), value: String(skills.length) }]}
      />
      <ToolModalSection>
        <ToolModalList>
          {skills.map((skill) => (
            <ToolModalRow
              key={skill.name}
              icon="layers"
              title={skill.name}
              detail={skill.description}
              meta={skill.source}
            />
          ))}
        </ToolModalList>
      </ToolModalSection>
    </>
  )
}
