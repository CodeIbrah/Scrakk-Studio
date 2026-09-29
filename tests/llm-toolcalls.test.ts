// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Regresión de la duplicación de tool calls: un provider no-conformante que
 * repite el mismo `id` con el `index` incrementado en cada chunk generaba N
 * entradas con el mismo id → N cards idénticas en el chat (con una sola
 * ejecución, porque el dedup de ejecución sí usa el id).
 */

import { describe, it, expect } from 'vitest'
import {
  accumulateToolCallDeltas,
  finalizedToolCalls,
  type StreamToolCallSlots
} from '../src/main/llm/streamToolCalls'

describe('acumulación de tool calls del stream', () => {
  it('provider conformante: index estable, args partidos en chunks', () => {
    const slots: StreamToolCallSlots = []
    accumulateToolCallDeltas(slots, [{ index: 0, id: 'c1', function: { name: 'read_file' } }])
    accumulateToolCallDeltas(slots, [{ index: 0, function: { arguments: '{"path":' } }])
    accumulateToolCallDeltas(slots, [{ index: 0, function: { arguments: '"a.ts"}' } }])

    const calls = finalizedToolCalls(slots)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.function.name).toBe('read_file')
    expect(calls[0]!.function.arguments).toBe('{"path":"a.ts"}')
  })

  it('provider no-conformante: repite el id con index creciente → 1 sola call', () => {
    const slots: StreamToolCallSlots = []
    accumulateToolCallDeltas(slots, [
      { index: 0, id: 'dup', function: { name: 'task', arguments: '{"a":' } }
    ])
    accumulateToolCallDeltas(slots, [
      { index: 1, id: 'dup', function: { name: 'task', arguments: '1' } }
    ])
    accumulateToolCallDeltas(slots, [
      { index: 2, id: 'dup', function: { name: 'task', arguments: '}' } }
    ])

    const calls = finalizedToolCalls(slots)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.id).toBe('dup')
    expect(calls[0]!.function.arguments).toBe('{"a":1}')
  })

  it('dos calls distintas en paralelo se mantienen separadas', () => {
    const slots: StreamToolCallSlots = []
    accumulateToolCallDeltas(slots, [
      { index: 0, id: 'a', function: { name: 'read_file', arguments: '{}' } },
      { index: 1, id: 'b', function: { name: 'grep', arguments: '{}' } }
    ])

    const calls = finalizedToolCalls(slots)
    expect(calls.map((call) => call.id)).toEqual(['a', 'b'])
  })

  it('dedup defensivo: huecos con ids repetidos emiten una sola call', () => {
    const slots: StreamToolCallSlots = [
      { id: 'x', type: 'function', function: { name: 'a', arguments: '1' } },
      undefined,
      { id: 'x', type: 'function', function: { name: 'a', arguments: '2' } }
    ]

    const calls = finalizedToolCalls(slots)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.function.arguments).toBe('1')
  })

  it('chunk de continuación sin id con index barrido se acumula en la última abierta', () => {
    const slots: StreamToolCallSlots = []
    accumulateToolCallDeltas(slots, [
      { index: 0, id: 'c1', function: { name: 'task', arguments: '{"p":' } }
    ])
    // index 5 sin id: no existe ese slot → se acumula en la última abierta.
    accumulateToolCallDeltas(slots, [{ index: 5, function: { arguments: '"x"}' } }])

    const calls = finalizedToolCalls(slots)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.function.arguments).toBe('{"p":"x"}')
  })

  it('chunk con id nuevo pero SIN name no genera card fantasma', () => {
    // Gateway que re-emite los argumentos bajo un id nuevo sin nombre: antes
    // creaba una segunda entrada (name '') → card sin click, no ejecutable.
    const slots: StreamToolCallSlots = []
    accumulateToolCallDeltas(slots, [
      {
        index: 0,
        id: 'call_a',
        function: { name: 'task', arguments: '{"subagent_type":"explorer"}' }
      }
    ])
    accumulateToolCallDeltas(slots, [
      { index: 1, id: 'call_b', function: { arguments: '{"subagent_type":"explorer"}' } }
    ])

    const calls = finalizedToolCalls(slots)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.id).toBe('call_a')
    expect(calls[0]!.function.name).toBe('task')
  })

  it('una call que nunca recibió name se descarta', () => {
    const slots: StreamToolCallSlots = []
    accumulateToolCallDeltas(slots, [{ index: 0, id: 'x', function: { arguments: '{}' } }])
    expect(finalizedToolCalls(slots)).toHaveLength(0)
  })
})
