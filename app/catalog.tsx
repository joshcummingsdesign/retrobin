"use client";

import Papa from "papaparse";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

type Console = {
  id: string;
  name: string;
  releaseDate: string;
  company: string;
  imagePath: string;
};

type Item = {
  id: string;
  type: "game" | "accessory";
  name: string;
  originalConsoleId: string;
  consoleIds: string;
  releaseDate: string;
  company: string;
  imagePath: string;
};

const date = (value: string, yearOnly = false) => {
  if (!value) return "Unknown";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-US", yearOnly ? { year: "numeric" } : {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(parsed);
};

const loadCsv = async <T,>(path: string) => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  const result = Papa.parse<T>(await response.text(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  if (result.errors.length) throw new Error(result.errors[0].message);
  return result.data;
};

function Artwork({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const placeholder = src.includes("/games/")
    ? "/images/placeholder-game.svg"
    : src.includes("/accessories/")
      ? "/images/placeholder-accessory.svg"
      : "/images/placeholder-console.svg";
  return (
    <img
      src={failed || !src ? placeholder : src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}

export default function Catalog() {
  const [consoles, setConsoles] = useState<Console[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState(0);
  const [selectedItem, setSelectedItem] = useState(0);
  const [kind, setKind] = useState<Item["type"]>("game");
  const [view, setView] = useState<"systems" | "items">("systems");
  const [error, setError] = useState("");
  const touchStart = useRef(0);

  useEffect(() => {
    Promise.all([
      loadCsv<Console>("/data/consoles.csv"),
      loadCsv<Item>("/data/items.csv"),
    ])
      .then(([nextConsoles, nextItems]) => {
        setConsoles(nextConsoles.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate)));
        setItems(nextItems);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const current = consoles[selected];
  const visibleItems = useMemo(() => {
    if (!current) return [];
    return items
      .filter((item) => item.type === kind && item.consoleIds.split("|").includes(current.id))
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  }, [current, items, kind]);
  const activeItemIndex = visibleItems.length ? selectedItem % visibleItems.length : 0;
  const activeItem = visibleItems[activeItemIndex];

  useEffect(() => setSelectedItem(0), [selected, kind]);

  const move = (amount: number) => {
    setSelected((index) => (index + amount + consoles.length) % consoles.length);
  };

  const carouselOffset = (index: number) => {
    let offset = index - selected;
    if (offset > consoles.length / 2) offset -= consoles.length;
    if (offset < -consoles.length / 2) offset += consoles.length;
    return offset;
  };

  const itemCarouselOffset = (index: number) => {
    let offset = index - activeItemIndex;
    if (offset > visibleItems.length / 2) offset -= visibleItems.length;
    if (offset < -visibleItems.length / 2) offset += visibleItems.length;
    return offset;
  };

  const moveItem = (amount: number) => {
    if (!visibleItems.length) return;
    setSelectedItem((index) => (index + amount + visibleItems.length) % visibleItems.length);
  };

  const moveActive = (amount: number) => view === "systems" ? move(amount) : moveItem(amount);

  if (error) return <main className="status"><p>Couldn’t load the collection.</p><small>{error}</small></main>;
  if (!current) return <main className="status">Loading collection…</main>;

  return (
    <main>
      <section
        className="hero"
        id="top"
        onTouchStart={(event) => { touchStart.current = event.changedTouches[0].clientX; }}
        onTouchEnd={(event) => {
          const distance = event.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(distance) > 50) moveActive(distance > 0 ? -1 : 1);
        }}
      >
        {view === "items" && (
          <div className="catalog-bar">
            <button className="back" onClick={() => setView("systems")}>
              <span className="back-arrow" aria-hidden="true">←</span>
              <span>Consoles</span>
            </button>
          <div className="tabs" role="group" aria-label="Collection type">
            <button className={kind === "game" ? "active" : ""} onClick={() => setKind("game")}>Games</button>
            <button className={kind === "accessory" ? "active" : ""} onClick={() => setKind("accessory")}>Accessories</button>
          </div>
          </div>
        )}

        <div className="hero-art" aria-label={view === "systems" ? "Console carousel" : `${kind} carousel`}>
          {(view === "systems" ? consoles : visibleItems).map((entry, index) => {
            const offset = view === "systems" ? carouselOffset(index) : itemCarouselOffset(index);
            const distance = Math.abs(offset);
            const style = {
              "--offset": offset,
              "--distance": distance,
              "--scale": offset === 0 ? 1 : Math.max(.58, 1 - distance * .2),
              zIndex: 10 - distance,
            } as CSSProperties;
            return (
              <button
                className={`carousel-card${view === "items" ? " item" : ""}${offset === 0 ? " selected" : ""}${distance > 2 ? " far" : ""}`}
                key={entry.id}
                style={style}
                onClick={() => {
                  if (view === "systems") {
                    if (index === selected) {
                      setSelectedItem(0);
                      setKind("game");
                      setView("items");
                    } else setSelected(index);
                  } else setSelectedItem(index);
                }}
                aria-label={`Show ${entry.name}`}
                aria-current={offset === 0 ? "true" : undefined}
                aria-hidden={distance > 2}
                tabIndex={distance > 2 ? -1 : 0}
              >
                <Artwork src={entry.imagePath} alt="" />
              </button>
            );
          })}
          {view === "items" && !visibleItems.length && (
            <p className="empty">No {kind === "game" ? "games" : "accessories"} added yet.</p>
          )}
        </div>

        <div className="hero-copy">
          {view === "systems" ? (
            <>
              <p className="eyebrow">{current.company} · {date(current.releaseDate, true)}</p>
              <h1>{current.name}</h1>
              <dl>
                <div><dt>Released</dt><dd>{date(current.releaseDate)}</dd></div>
                <div><dt>By</dt><dd>{current.company || "Unknown"}</dd></div>
              </dl>
            </>
          ) : activeItem ? (() => {
            const original = consoles.find((console) => console.id === activeItem.originalConsoleId);
            return (
              <>
                <p className="eyebrow">{activeItem.company} · {date(activeItem.releaseDate, true)}</p>
                <h1>{activeItem.name}</h1>
                <dl>
                  <div><dt>Released</dt><dd>{date(activeItem.releaseDate)}</dd></div>
                  <div><dt>By</dt><dd>{activeItem.company || "Unknown"}</dd></div>
                  {kind === "game" && original && <div><dt>Console</dt><dd>{original.name} ({date(original.releaseDate, true)})</dd></div>}
                </dl>
              </>
            );
          })() : <h1>No {kind === "game" ? "games" : "accessories"}</h1>}

          {(view === "systems" || visibleItems.length > 1) && (
            <nav className="console-controls" aria-label={`Choose a ${view === "systems" ? "console" : kind}`}>
              <button onClick={() => moveActive(-1)} aria-label="Previous">←</button>
              <div className="console-dots">
                {(view === "systems" ? consoles : visibleItems).map((entry, index) => {
                  const isActive = index === (view === "systems" ? selected : activeItemIndex);
                  return <button className={isActive ? "active" : ""} key={entry.id} onClick={() => view === "systems" ? setSelected(index) : setSelectedItem(index)} aria-label={`Show ${entry.name}`} aria-current={isActive ? "true" : undefined} />;
                })}
              </div>
              <button onClick={() => moveActive(1)} aria-label="Next">→</button>
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}
