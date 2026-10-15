import { createDefaultState, currentPeriod, FREE_ACTION_LIMIT } from "./constants"
import type { ExtensionState, QuotaDecision } from "./types"

export function reserveAction(
  state: ExtensionState,
  now: Date = new Date(),
  amount = 1,
): QuotaDecision {
  const period = currentPeriod(now)
  const normalizedState = state.quota.period === period ? state : resetQuota(state, period)

  if (normalizedState.license.plan === "pro") {
    return { allowed: true, state: normalizedState }
  }

  const nextUsed = normalizedState.quota.used + amount
  if (nextUsed > normalizedState.quota.limit) {
    return { allowed: false, state: normalizedState, reason: "limit_reached" }
  }

  return {
    allowed: true,
    state: {
      ...normalizedState,
      quota: { ...normalizedState.quota, used: nextUsed },
    },
  }
}

export function resetQuota(state: ExtensionState, period: string): ExtensionState {
  return {
    ...state,
    quota: { period, used: 0, limit: FREE_ACTION_LIMIT },
  }
}

export function quotaLabel(state: ExtensionState): string {
  if (state.license.plan === "pro") return "Pro"
  return `${Math.max(state.quota.limit - state.quota.used, 0)} / ${state.quota.limit}`
}

export function createFreshQuotaState(now: Date = new Date()): ExtensionState {
  return createDefaultState(now)
}
