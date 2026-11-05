// Пластинка: выезжает из конверта, крутится 33⅓ об/мин, её можно «скретчить» мышкой — это перемотка.
import { useRef } from "react";
import { Disc3 } from "lucide-react";
import { engine } from "../lib/audio";
import { damp } from "../lib/dsp";
import { useFrame } from "../lib/frame";
import { player, position, seek } from "../state/player";

const RPM_DEG_PER_SEC = (100 / 3 / 60) * 360; // 33⅓ об/мин
const SEC_PER_TURN = 60 / (100 / 3);

export function Vinyl({ cover, showVinyl }: { cover?: string; showVinyl: boolean }) {
  const disc = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const sleeve = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const speed = useRef(0);
  const drag = useRef<{ last: number; startPos: number; turned: number } | null>(null);

  useFrame((dt) => {
    const playing = player.get().playing;
    speed.current = damp(speed.current, playing && !drag.current ? RPM_DEG_PER_SEC : 0, playing ? 2.2 : 3.5, dt);
    if (!drag.current) angle.current = (angle.current + speed.current * dt) % 360;
    if (disc.current) disc.current.style.transform = `rotate(${angle.current.toFixed(2)}deg)`;
    // Свечение и «пульс» — только прозрачность и масштаб: видеокарта делает это бесплатно.
    if (glow.current) glow.current.style.opacity = engine.pulse.toFixed(3);
    if (sleeve.current) sleeve.current.style.transform = `scale(${(1 + engine.pulse * 0.018).toFixed(4)})`;
  });

  const pointerAngle = (e: React.PointerEvent) => {
    const r = disc.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  return (
    <div className={`vinyl-stage ${showVinyl ? "with-disc" : ""}`}>
      {showVinyl && (
        <div className="vinyl-slot">
        <div ref={glow} className="vinyl-glow" />
        <div
          ref={disc}
          className="vinyl-disc"
          title="Крути пластинку, чтобы перемотать"
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { last: pointerAngle(e), startPos: position(), turned: 0 };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const a = pointerAngle(e);
            let delta = a - d.last;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            d.last = a;
            d.turned += delta;
            angle.current += delta;
          }}
          onPointerUp={() => {
            const d = drag.current;
            drag.current = null;
            if (d && Math.abs(d.turned) > 2) seek(d.startPos + (d.turned / 360) * SEC_PER_TURN * 4);
          }}
        >
          <div className="vinyl-label" style={cover ? { backgroundImage: `url("${cover}")` } : undefined} />
          <div className="vinyl-hole" />
        </div>
        </div>
      )}
      <div ref={sleeve} className="vinyl-sleeve" style={cover ? { backgroundImage: `url("${cover}")` } : undefined}>
        {!cover && <Disc3 size={72} strokeWidth={1.2} />}
      </div>
    </div>
  );
}
