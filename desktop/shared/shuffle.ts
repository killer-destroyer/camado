// Умный рандом: не повторяет недавние треки и не ставит одного исполнителя два раза подряд.

export interface ShuffleItem {
  id: string;
  artist: string;
}

/** Сколько последних треков не повторять: до 20, но не больше половины очереди. */
export const recentLimit = (n: number) => Math.max(1, Math.min(20, Math.floor(n / 2)));

export function pickShuffle(queue: ShuffleItem[], current: number, recent: string[], rnd: () => number = Math.random): number {
  const n = queue.length;
  if (n <= 1) return 0;
  const cur = queue[current];
  const banned = new Set(recent.slice(-recentLimit(n)));
  const all = queue.map((_, i) => i).filter((i) => i !== current);
  const fresh = all.filter((i) => !banned.has(queue[i]!.id));
  const pool = fresh.length ? fresh : all;
  const otherArtist = cur ? pool.filter((i) => queue[i]!.artist.toLowerCase() !== cur.artist.toLowerCase()) : pool;
  const final = otherArtist.length ? otherArtist : pool;
  return final[Math.floor(rnd() * final.length)]!;
}
