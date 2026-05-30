export type RngState = number;

export function hashSeed(seed: string): RngState {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function nextRandom(state: RngState): { value: number; state: RngState } {
  let nextState = (state + 0x6d2b79f5) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  const random = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  return { value: random, state: nextState };
}

export function shuffleWithState<T>(
  values: readonly T[],
  rngState: RngState
): { values: T[]; rngState: RngState } {
  const shuffled = [...values];
  let state = rngState;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const next = nextRandom(state);
    state = next.state;
    const swapIndex = Math.floor(next.value * (index + 1));
    const current = shuffled[index];
    const swap = shuffled[swapIndex];

    if (current !== undefined && swap !== undefined) {
      shuffled[index] = swap;
      shuffled[swapIndex] = current;
    }
  }

  return { values: shuffled, rngState: state };
}
