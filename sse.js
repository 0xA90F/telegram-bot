import fetch from 'node-fetch';
import { API_BASE } from './constants.js';

let sseActive = false;
let onRoundTransition = null;
let onDeployed = null;
let reconnectTimer = null;
let controller = null;

export function setSSECallbacks({ onTransition, onDeploy }) {
  onRoundTransition = onTransition;
  onDeployed = onDeploy;
}

export function isSSEActive() {
  return sseActive;
}

export async function startSSE() {
  if (sseActive) return;
  sseActive = true;
  connectSSE();
}

export function stopSSE() {
  sseActive = false;
  if (controller) controller.abort();
  if (reconnectTimer) clearTimeout(reconnectTimer);
}

async function connectSSE() {
  if (!sseActive) return;

  try {
    controller = new AbortController();
    const res = await fetch(`${API_BASE}/api/events/rounds`, {
      signal: controller.signal,
      headers: { Accept: 'text/event-stream' },
    });

    if (!res.ok) throw new Error(`SSE HTTP ${res.status}`);

    console.log('📡 SSE connected');
    let buffer = '';

    for await (const chunk of res.body) {
      if (!sseActive) break;
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // simpan baris terakhir (mungkin belum lengkap)

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            handleSSEEvent(data);
          } catch {
            // ignore parse errors
          }
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('SSE error:', err.message);
    }
  }

  // Reconnect setelah 5 detik jika masih aktif
  if (sseActive) {
    reconnectTimer = setTimeout(connectSSE, 5000);
  }
}

function handleSSEEvent(event) {
  if (!event?.type) return;

  switch (event.type) {
    case 'roundTransition':
      if (onRoundTransition) onRoundTransition(event.data);
      break;
    case 'deployed':
      if (onDeployed) onDeployed(event.data);
      break;
    case 'heartbeat':
      // Heartbeat setiap 30 detik — tandanya koneksi masih hidup
      break;
  }
}
