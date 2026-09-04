'use client'

import { useSyncExternalStore } from 'react'
import type { WeeklyRecap } from './weeklyLeague/recap'

/**
 * Things the assistant should know that live outside the save — loaded by
 * one screen (the weekly tab reads the league from the server) and spoken
 * about on another (the home card). A tiny module store keeps the card free
 * of Supabase; screens publish, the card subscribes.
 */
export interface AssistantHints {
  /** Last week's result and where it sent the club, once the weekly tab has read it. */
  recap?: WeeklyRecap | null
  /** Bumped whenever the art mode or the quiet switch changes anywhere. */
  settingsVersion: number
}

let hints: AssistantHints = { settingsVersion: 0 }
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function setAssistantHints(patch: Partial<Omit<AssistantHints, 'settingsVersion'>>): void {
  hints = { ...hints, ...patch }
  emit()
}

/** Call after saving the mode or the quiet flag so every card re-reads them. */
export function notifyAssistantSettings(): void {
  hints = { ...hints, settingsVersion: hints.settingsVersion + 1 }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => hints
const getServerSnapshot = () => hints

export function useAssistantHints(): AssistantHints {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
