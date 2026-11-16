// «Кастом» главного экрана: карточки в своём порядке и своего размера, лишние спрятаны.
// «Настроить» — стрелки, размер, скрыть; карточки можно перетаскивать мышью.
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, LayoutGrid, Maximize2, RotateCcw, Settings2 } from "lucide-react";
import { CARD_LABEL, DEFAULT_CUSTOM, moveCard, offSidebar, SECTION_LABEL, setCard, SIZE_LABEL, SIZES, type CardId, type CustomLayout } from "../../../shared/custom";
import { useStore } from "../lib/store";
import { app, go, updateSettings } from "../state/app";
import { NAV } from "./Chrome";

const CARD_MIME = "application/x-camado-card";

export function saveCustom(c: CustomLayout): void {
  updateSettings({ custom: c });
}

export function HomeGrid({ cards }: { cards: Record<CardId, () => ReactNode> }) {
  const custom = useStore(app, (s) => s.settings.custom);
  const [edit, setEdit] = useState(false);
  const [over, setOver] = useState<CardId | null>(null);
  const hidden = custom.home.filter((c) => c.hidden);
  const showSections = offSidebar(custom).length > 0;
  const visible = custom.home.filter((c) => !c.hidden && (c.id !== "sections" || showSections || edit));

  return (
    <>
      <div className="home-tools">
        {edit && hidden.length > 0 && (
          <span className="muted small home-hidden">
            Скрыто:{" "}
            {hidden.map((c) => (
              <button key={c.id} className="chip-btn" onClick={() => saveCustom(setCard(custom, c.id, { hidden: false }))} title="Вернуть на главный экран">
                <Eye size={13} /> {CARD_LABEL[c.id]}
              </button>
            ))}
          </span>
        )}
        {edit && (
          <button className="link-btn" onClick={() => saveCustom({ ...DEFAULT_CUSTOM, sidebar: custom.sidebar })} title="Вернуть карточки как было">
            <RotateCcw size={13} /> как было
          </button>
        )}
        <button className={`btn sm ${edit ? "primary" : ""}`} onClick={() => setEdit(!edit)} title="Свой главный экран: порядок, размер и какие карточки показывать">
          <LayoutGrid size={15} /> {edit ? "Готово" : "Настроить"}
        </button>
      </div>
      <div className={`today-grid custom ${edit ? "editing" : ""}`}>
        {visible.map((c) => {
          const i = custom.home.findIndex((x) => x.id === c.id);
          return (
            <div
              key={c.id}
              className={`tcell size-${c.size} ${over === c.id ? "drop" : ""}`}
              data-card={c.id}
              draggable={edit}
              onDragStart={(e) => e.dataTransfer.setData(CARD_MIME, c.id)}
              onDragOver={(e) => {
                if (!edit || !e.dataTransfer.types.includes(CARD_MIME)) return;
                e.preventDefault();
                setOver(c.id);
              }}
              onDragLeave={() => setOver((o) => (o === c.id ? null : o))}
              onDrop={(e) => {
                const from = e.dataTransfer.getData(CARD_MIME) as CardId;
                setOver(null);
                if (from && from !== c.id) saveCustom(moveCard(custom, from, i));
              }}
            >
              {edit && (
                <div className="tcell-tools">
                  <b>{CARD_LABEL[c.id]}</b>
                  <button title="Раньше" onClick={() => saveCustom(moveCard(custom, c.id, i - 1))}>
                    <ChevronLeft size={14} />
                  </button>
                  <button title="Позже" onClick={() => saveCustom(moveCard(custom, c.id, i + 1))}>
                    <ChevronRight size={14} />
                  </button>
                  <button title={`Размер: ${SIZE_LABEL[c.size]} — нажми, чтобы сменить`} onClick={() => saveCustom(setCard(custom, c.id, { size: SIZES[(SIZES.indexOf(c.size) + 1) % SIZES.length]! }))}>
                    <Maximize2 size={13} /> {SIZE_LABEL[c.size]}
                  </button>
                  <button title="Скрыть" onClick={() => saveCustom(setCard(custom, c.id, { hidden: true }))}>
                    <EyeOff size={14} />
                  </button>
                </div>
              )}
              {cards[c.id]()}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Разделы, которых нет на боковой панели, — маленькими иконками. */
export function SectionsCard() {
  const custom = useStore(app, (s) => s.settings.custom);
  const rest = offSidebar(custom);
  return (
    <div className="card glass sections-card">
      <div className="sections-row">
        {rest.map((id) => {
          const n = NAV.find((x) => x.id === id);
          const Icon = n?.icon ?? LayoutGrid;
          return (
            <button key={id} className="sec-icon" onClick={() => go(id)} title={SECTION_LABEL[id]}>
              <Icon size={20} />
              <span>{SECTION_LABEL[id]}</span>
            </button>
          );
        })}
        {rest.length === 0 && <span className="muted small">Все разделы — на боковой панели.</span>}
        <button className="sec-icon ghost" onClick={() => go("settings")} title="Что стоит на боковой панели — в Настройках">
          <Settings2 size={20} />
          <span>Панель</span>
        </button>
      </div>
    </div>
  );
}
