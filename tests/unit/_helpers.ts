// 测试用 PlayerState 工厂
import type { PlayerState, AreaId } from '../../functions/lib/types';

const ALL_AREAS: AreaId[] = ['gate', 'market', 'metro', 'tenements', 'factory', 'river', 'undernet'];

export function emptyPicked(): Record<AreaId, string[]> {
  const r: Record<string, string[]> = {};
  for (const a of ALL_AREAS) r[a] = [];
  return r as Record<AreaId, string[]>;
}

export function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    player_id: 't',
    area: 'gate',
    attrs: { hp: 100, stamina: 100, radiation: 0, reputation: 0, scrap: 0 },
    inventory: [],
    quests: {},
    npc: {},
    flags: {},
    picked: emptyPicked(),
    ending: null,
    finished_at: null,
    updated_at: 0,
    ...overrides,
  };
}
