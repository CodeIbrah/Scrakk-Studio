// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * DiagnosticsCard — custom display for get_diagnostics tool.
 * Shows diagnostics grouped by severity per file.
 */

import type { JSX } from 'react'
import { ToolShimmerText } from '@services/ai/tool-shell'

import { t } from '@core/i18n'
interface DiagnosticsCardProps {
  args: Record<string, unknown>
  result?: string
  status?: string
}

export function DiagnosticsCard({ args, status }: DiagnosticsCardProps): JSX.Element | null {
  // While loading: simple shimmer text.
  if (status === 'pending' || status === 'streaming' || status === 'running') {
    return <ToolShimmerText text="Getting diagnostics…" />
  }
  const paths = Array.isArray(args.paths) ? args.paths.map(String) : []
  return <span>{t('misc.requested.diagnostics')}{paths.length > 0 ? ` (${paths.length} file(s))` : ''}</span>
}
