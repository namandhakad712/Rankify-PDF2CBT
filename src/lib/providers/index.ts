// Registry — add/delete a provider = add/delete its file + one line here
// This is the ONLY place to register. Keep it explicit for easy diff.

import type { ProviderDef } from "./types"
import { mistralProvider } from "./mistral"
import { groqProvider } from "./groq"
import { nvidiaProvider } from "./nvidia"
// TO ADD: import { cerebrasProvider } from "./cerebras" — then add to array
// TO DELETE: remove import + remove from array — no other changes needed

export const providers: ProviderDef[] = [
  mistralProvider,
  groqProvider,
  nvidiaProvider,
]

export const providerMap = new Map<string, ProviderDef>(providers.map((p) => [p.id, p]))

export function getProvider(id: string): ProviderDef | undefined {
  return providerMap.get(id)
}

export function listProviderIds(): string[] {
  return providers.map((p) => p.id)
}

// For UI dropdown
export const providerOptions = providers.map((p) => ({
  value: p.id,
  label: p.label,
  defaultModel: p.defaultModel,
  docsUrl: p.docsUrl,
}))

// Re-export types
export type { ProviderDef, ProviderChatOpts, ProviderMessage } from "./types"
// Generic harness — any OpenAI-compatible provider via Base URL + key
export {
  createCustomProvider,
  loadCustomConfig,
  saveCustomConfig,
  clearCustomConfig,
  normalizeBaseUrl,
  CUSTOM_PRESETS,
  type CustomProviderConfig,
} from "./custom"
