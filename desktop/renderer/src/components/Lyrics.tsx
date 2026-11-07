// Тексты песен: «Лента», «Взрыв», «Строка», «Караоке».
import { forwardRef, useEffect, useRef, useState } from "react";
import type { LyricsMode } from "../../../shared/settings";
import type { Lyrics as LyricsData, LyricsWord } from "../../../shared/types";
import { activeLineIndex, timedWords } from "../../../shared/lrc";
import { engine } from "../lib/audio";
import { damp, layoutBurst, type BurstWord } from "../lib/dsp";
import { useFrame } from "../lib/frame";
import { useStore } from "../lib/store";
import { catchLyricsLine, duration, lyricsTime, player, seek } from "../state/player";

// Совсем чуть-чуть раньше звука: глаз успевает прочитать к моменту, когда слово прозвучит.
// Задержку самого звука (Bluetooth и т. п.) уже вычитает lyricsTime().
const LOOKAHEAD = 0.04;

function useActiveLine(lyrics: LyricsData): [number, React.MutableRefObject<number>] {
  const [active, setActive] = useState(-1);
  const ref = useRef(-1);
  useFrame(() => {
    const t = lyricsTime() + LOOKAHEAD;
    const idx = lyrics.synced
      ? activeLineIndex(lyrics.lines, t)
      : Math.min(lyrics.lines.length - 1, Math.floor((t / Math.max(1, duration())) * lyrics.lines.length));
    if (idx !== ref.current) {
      ref.current = idx;
      setActive(idx);
    }
  }, 20);
  return [active, ref];
}

/** Заливка слов активной строки (караоке), обновляется каждый кадр. */
function fillWords(container: HTMLElement | null, words: LyricsWord[], nextTime: number): void {
  if (!container) return;
  const t = lyricsTime() + LOOKAHEAD;
  const spans = container.children;
  for (let i = 0; i < spans.length; i++) {
    const w = words[i];
    if (!w) continue;
    const end = words[i + 1]?.time ?? nextTime;
    const p = Math.max(0, Math.min(1, (t - w.time) / Math.max(0.12, end - w.time)));
    (spans[i] as HTMLElement).style.setProperty("--fill", p.toFixed(3));
  }
}

const WordSpans = forwardRef<HTMLSpanElement, { words: LyricsWord[] }>(function WordSpans({ words }, ref) {
  return (
    <span ref={ref} className="karaoke">
      {words.map((w, i) => (
        <span key={i} className="kw">
          {w.text}{" "}
        </span>
      ))}
    </span>
  );
});

// ---------- Лента ----------

function FlowLyrics({ lyrics }: { lyrics: LyricsData }) {
  const box = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLDivElement | null)[]>([]);
  const karaoke = useRef<HTMLSpanElement>(null);
  const y = useRef(0);
  const [active, activeRef] = useActiveLine(lyrics);
  const words = active >= 0 && lyrics.synced ? timedWords(lyrics.lines, active, duration()) : [];

  useFrame((dt) => {
    const el = box.current;
    if (!el) return;
    const idx = Math.max(0, activeRef.current);
    const line = lines.current[idx];
    const target = line ? line.offsetTop + line.offsetHeight / 2 : 0;
    y.current = damp(y.current, target, 6.5, dt);
    el.style.transform = `translate3d(0, ${-y.current}px, 0)`;
    if (lyrics.synced && activeRef.current >= 0) {
      fillWords(karaoke.current, words, lyrics.lines[activeRef.current + 1]?.time ?? duration());
    }
  }, 21);

  return (
    <div className="lyrics-flow">
      <div ref={box} className="lyrics-flow-inner">
        {lyrics.lines.map((l, i) => {
          const d = active < 0 ? 3 : Math.min(4, Math.abs(i - active));
          return (
            <div
              key={i}
              ref={(el) => {
                lines.current[i] = el;
              }}
              className={`lf-line ${i === active ? "active" : ""} ${i < active ? "past" : ""}`}
              data-d={d}
              onClick={() => {
                if (!lyrics.synced) return;
                if (player.get().syncLyrics) catchLyricsLine(l.time);
                else seek(l.time);
              }}
            >
              {i === active && lyrics.synced ? <WordSpans ref={karaoke} words={words} /> : l.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Взрыв ----------

interface BurstLine {
  idx: number;
  words: BurstWord[];
}

function BurstLyrics({ lyrics }: { lyrics: LyricsData }) {
  const root = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState<BurstLine | null>(null);
  const [prev, setPrev] = useState<BurstLine | null>(null);
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  const curRef = useRef<BurstLine | null>(null);
  const [active, activeRef] = useActiveLine(lyrics);

  useEffect(() => {
    const el = root.current;
    if (!el || active < 0) return;
    const words = timedWords(lyrics.lines, active, duration());
    const base = Math.min(el.clientWidth, el.clientHeight) * 0.075;
    const line = {
      idx: active,
      words: layoutBurst(words, active + 1, el.clientWidth, el.clientHeight, base, false),
    };
    setPrev(curRef.current);
    curRef.current = line;
    setCur(line);
    shownRef.current = 0;
    setShown(0);
  }, [active, lyrics]);

  useFrame(() => {
    const line = curRef.current;
    if (root.current) root.current.style.transform = `scale(${(1 + engine.pulse * 0.035).toFixed(4)})`;
    if (!line || line.idx !== activeRef.current) return;
    const t = lyricsTime() + LOOKAHEAD;
    let n = 0;
    while (n < line.words.length && line.words[n]!.time <= t) n++;
    if (n !== shownRef.current) {
      shownRef.current = n;
      setShown(n);
    }
  }, 22);

  const render = (line: BurstLine, count: number, out: boolean) =>
    line.words.slice(0, count).map((w, i) => (
      <span
        key={`${line.idx}-${i}`}
        className={`burst-word s${w.style} ${out ? "out" : "in"}`}
        style={{
          left: `${w.x * 100}%`,
          top: `${w.y * 100}%`,
          fontSize: `calc(${w.size}px * var(--lyrics-scale))`,
          ["--r" as string]: `${w.rotate}deg`,
        }}
      >
        {w.text}
      </span>
    ));

  if (!lyrics.synced) return <FlowLyrics lyrics={lyrics} />;
  return (
    <div ref={root} className="lyrics-burst">
      {prev && render(prev, prev.words.length, true)}
      {cur && render(cur, shown, false)}
    </div>
  );
}

// ---------- Строка ----------

function LineLyrics({ lyrics }: { lyrics: LyricsData }) {
  const karaoke = useRef<HTMLSpanElement>(null);
  const [active, activeRef] = useActiveLine(lyrics);
  const words = active >= 0 ? timedWords(lyrics.lines, active, duration()) : [];
  useFrame(() => {
    if (activeRef.current >= 0) fillWords(karaoke.current, words, lyrics.lines[activeRef.current + 1]?.time ?? duration());
  }, 21);
  if (!lyrics.synced) return <FlowLyrics lyrics={lyrics} />;
  const nextLine = lyrics.lines[active + 1]?.text;
  return (
    <div className="lyrics-line">
      <div key={active} className="ll-current">
        {active >= 0 ? <WordSpans ref={karaoke} words={words} /> : <span className="ll-wait">♪</span>}
      </div>
      {nextLine && (
        <div key={`n${active}`} className="ll-next">
          {nextLine}
        </div>
      )}
    </div>
  );
}

// ---------- Караоке ----------

/**
 * Караоке: крупно текущая строка, слова заливаются ровно когда их поют (по пословной разметке),
 * снизу — следующая. В проигрыше перед строкой — обратный отсчёт точками, чтобы вступить вовремя.
 */
function KaraokeLyrics({ lyrics }: { lyrics: LyricsData }) {
  const karaoke = useRef<HTMLSpanElement>(null);
  const dots = useRef<HTMLDivElement>(null);
  const [active, activeRef] = useActiveLine(lyrics);
  const words = active >= 0 ? timedWords(lyrics.lines, active, duration()) : [];
  const [gap, setGap] = useState(false);
  const gapRef = useRef(false);
  useFrame(() => {
    const i = activeRef.current;
    const t = lyricsTime() + LOOKAHEAD;
    const next = lyrics.lines[i + 1];
    // строка допета (последнее слово + запас), а до следующей ещё больше 3 с — это проигрыш
    const lastWord = words.at(-1)?.time ?? lyrics.lines[i]?.time ?? 0;
    const inGap = !!next && next.time - t > 0.2 && next.time - Math.max(lastWord + 1.5, t) > 0 && next.time - (lastWord + 1.5) > 3 && t > lastWord + 1.5;
    const beforeFirst = i < 0 && lyrics.lines[0] && lyrics.lines[0].time - t < 4;
    const g = inGap || !!beforeFirst;
    if (g !== gapRef.current) {
      gapRef.current = g;
      setGap(g);
    }
    if (g && dots.current) {
      const left = (next ?? lyrics.lines[0])!.time - t;
      const n = Math.max(0, Math.min(3, Math.ceil(left)));
      for (let k = 0; k < dots.current.children.length; k++) (dots.current.children[k] as HTMLElement).style.opacity = k < n ? "1" : "0.15";
    }
    if (i >= 0) fillWords(karaoke.current, words, next?.time ?? duration());
  }, 21);
  if (!lyrics.synced) return <FlowLyrics lyrics={lyrics} />;
  const nextLine = lyrics.lines[active + 1]?.text;
  return (
    <div className="lyrics-karaoke">
      {gap ? (
        <div className="lk-wait">
          <div ref={dots} className="lk-dots">
            <i />
            <i />
            <i />
          </div>
          {nextLine && <div className="lk-next">{active < 0 ? lyrics.lines[0]?.text : nextLine}</div>}
        </div>
      ) : (
        <>
          <div key={active} className="lk-current">
            {active >= 0 ? <WordSpans ref={karaoke} words={words} /> : <span className="ll-wait">♪</span>}
          </div>
          {nextLine && (
            <div key={`n${active}`} className="lk-next">
              {nextLine}
            </div>
          )}
        </>
      )}
      {lyrics.wordTimed && <div className="lk-badge">по словам</div>}
    </div>
  );
}

/** Текст песни. Нет текста или он ещё ищется — ничего не показываем (без надписей). */
export function Lyrics({ lyrics, mode }: { lyrics?: LyricsData; loading?: boolean; mode: LyricsMode }) {
  const syncing = useStore(player, (s) => !!s.syncLyrics);
  if (!lyrics || lyrics.lines.length === 0) return null;
  // Пока подгоняем текст, нужен список строк, по которым можно нажать.
  if (syncing && lyrics.synced) return <FlowLyrics lyrics={lyrics} />;
  if (mode === "off") return null;
  if (mode === "burst") return <BurstLyrics lyrics={lyrics} />;
  if (mode === "line") return <LineLyrics lyrics={lyrics} />;
  if (mode === "karaoke") return <KaraokeLyrics lyrics={lyrics} />;
  return <FlowLyrics lyrics={lyrics} />;
}
