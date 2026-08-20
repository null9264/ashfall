// v2.0.3 P2: 天气系统
//   - 每天玩家第一次 /api/state 时,如果 day 改变,基于 day 重新算天气
//   - 天气影响 area.danger 偏移(±3)、部分 NPC 隐藏触发阈值(潮湿让地铁娃娃更愿意说话)
//   - 前端展示当天天气(icon + name + effect)
import type { PlayerState } from './types';

export type WeatherId = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'radiant';

export interface WeatherDef {
  id: WeatherId;
  name: string;       // 中文短名
  icon: string;       // emoji
  // 对所有 danger 区影响(地铁 +X / 地下管网 +X)
  dangerMod: Partial<Record<'metro' | 'undernet', number>>;
  // 文案(给前端的 hint)
  blurb: string;
}

// 用 day 简单 hash → 天气(确定性,保证玩家复现)
const WEATHERS: WeatherDef[] = [
  { id: 'sunny',   name: '晴',     icon: '☀', dangerMod: { metro: -3, undernet: 0 }, blurb: '难得的好天气。辐射被阳光压了一点。' },
  { id: 'cloudy',  name: '阴',     icon: '☁', dangerMod: { metro: 0,  undernet: 0 }, blurb: '云层压得很低,但也没下。' },
  { id: 'rain',    name: '小雨',   icon: '🌦', dangerMod: { metro: 2, undernet: 2 }, blurb: '湿气把地面毒气都压了上来。' },
  { id: 'storm',   name: '辐射风暴', icon: '⚡', dangerMod: { metro: 5, undernet: 4 }, blurb: '远方电离层撕裂,辐射狂涨。最好别出门。' },
  { id: 'radiant', name: '辐射雾',   icon: '☢', dangerMod: { metro: 4, undernet: 6 }, blurb: '雾里夹着肉眼看不见的颗粒。戴口罩也别久留。' },
];

// 简单 hash
function hashDay(day: number): number {
  let h = day;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return Math.abs(h);
}

export function getWeatherForDay(day: number): WeatherDef {
  const idx = hashDay(day) % WEATHERS.length;
  return WEATHERS[idx];
}

export function applyWeather(s: PlayerState): WeatherDef {
  const day = typeof s.day === 'number' ? s.day : 1;
  const w = getWeatherForDay(day);
  // 缓存当天的天气 id 到 flags(供事件/对话引用)
  s.flags[`weather_day_${day}`] = w.id as any;
  return w;
}

// 给 view 用的格式化辅助
export interface WeatherView {
  id: WeatherId;
  name: string;
  icon: string;
  blurb: string;
  dangerOffset: number;
}

export function weatherToView(w: WeatherDef, area: 'metro' | 'undernet' | null = null): WeatherView {
  const offset = area ? (w.dangerMod[area] ?? 0) : 0;
  return {
    id: w.id,
    name: w.name,
    icon: w.icon,
    blurb: w.blurb,
    dangerOffset: offset,
  };
}