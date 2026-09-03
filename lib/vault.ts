/**
 * The card vault. Every player card takes a slot, so collecting past the
 * starting room means paying gold to expand — up to a hard ceiling.
 */
export const BASE_CAPACITY = 80
export const CAPACITY_STEP = 10
export const MAX_CAPACITY = 200

/** Gold for the next ten slots. Each expansion costs more than the last. */
export function expandCost(capacity: number): number {
  const steps = Math.max(0, Math.round((capacity - BASE_CAPACITY) / CAPACITY_STEP))
  return 300 + steps * 150
}

export function canExpand(capacity: number): boolean {
  return capacity < MAX_CAPACITY
}

export function normalizeCapacity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return BASE_CAPACITY
  const steps = Math.round((value - BASE_CAPACITY) / CAPACITY_STEP)
  return Math.min(MAX_CAPACITY, Math.max(BASE_CAPACITY, BASE_CAPACITY + steps * CAPACITY_STEP))
}

/** Slots left for new cards. Never negative, even if a save is over the cap. */
export function freeSlots(held: number, capacity: number): number {
  return Math.max(0, capacity - held)
}

export function hasRoomFor(held: number, capacity: number, incoming: number): boolean {
  return freeSlots(held, capacity) >= incoming
}
