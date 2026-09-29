// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Idle shutdown del LSP: un server sin documentos abiertos se apaga solo
 * (shutdown ordenado) y el próximo archivo de ese lenguaje lo vuelve a
 * levantar, lazy. Evita que servers pesados queden vivos sin usarse.
 *
 * Se controla con `SCRAKK_LSP_IDLE_MS` (acá, corto para el test).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import { LspManager } from '../../src/main/lsp/manager'
import { useScrakkHomeForTests, resetScrakkHome, writeJsonLayer, projectConfigPath } from '../../src/main/scrakkFolder'
import { makeTempDir, cleanupDir, waitFor } from '../helpers/lsp-test-utils'

const MOCK_SERVER = path.resolve(__dirname, '../helpers/mock-lsp-server.mjs')

let homeDir: string | undefined
let projectDir: string | undefined
let previousIdle: string | undefined

beforeEach(async () => {
  homeDir = await makeTempDir('lsp-idle-home-')
  projectDir = await makeTempDir('lsp-idle-proj-')
  useScrakkHomeForTests(homeDir)
  previousIdle = process.env.SCRAKK_LSP_IDLE_MS
  process.env.SCRAKK_LSP_IDLE_MS = '250'
})

afterEach(async () => {
  if (previousIdle === undefined) delete process.env.SCRAKK_LSP_IDLE_MS
  else process.env.SCRAKK_LSP_IDLE_MS = previousIdle
  resetScrakkHome()
  await cleanupDir(homeDir)
  await cleanupDir(projectDir)
})

function mockServerConfig(name: string): Record<string, unknown> {
  return {
    command: process.execPath,
    args: [MOCK_SERVER, name],
    extensions: { '.mockts': 'mocklang' }
  }
}

async function makeManager(): Promise<LspManager> {
  const manager = new LspManager(
    () => {},
    () => {}
  )
  await manager.setWorkspace(projectDir!)
  return manager
}

describe('LSP idle shutdown', () => {
  it('apaga el server al cerrar el último archivo, y lo revive al reabrirlo', async () => {
    await writeJsonLayer(projectConfigPath(projectDir!, 'lsp.json'), {
      alpha: mockServerConfig('alpha')
    })

    const manager = await makeManager()
    const file = path.join(projectDir!, 'code.mockts')

    // 1) Abrir un archivo → el server arranca (lazy).
    await fs.writeFile(file, 'hello\n')
    await manager.notifyFileChanged(file, 'hello\n')
    await waitFor(() => manager.status().find((s) => s.name === 'alpha')?.state === 'ready')

    // 2) Cerrar el archivo → sin documentos, entra en cuenta regresiva.
    await manager.notifyFileClosed(file)
    await waitFor(() => manager.status().find((s) => s.name === 'alpha')?.state === 'stopped', 4_000)
    expect(manager.getRunningPid('alpha')).toBeUndefined()

    // 3) Reabrirlo → se vuelve a levantar solo.
    await manager.notifyFileChanged(file, 'hello\n')
    await waitFor(() => manager.status().find((s) => s.name === 'alpha')?.state === 'ready')

    await manager.shutdownAll()
  }, 25_000)
})
