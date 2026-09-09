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
  const [kind, setKind] = useState<Item["type"]>("game");
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
  const move = (amount: number) => {
    setSelected((index) => (index + amount + consoles.length) % consoles.length);
  };

  const carouselOffset = (index: number) => {
    let offset = index - selected;
    if (offset > consoles.length / 2) offset -= consoles.length;
    if (offset < -consoles.length / 2) offset += consoles.length;
    return offset;
  };

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
          if (Math.abs(distance) > 50) move(distance > 0 ? -1 : 1);
        }}
      >
        <div className="hero-art" aria-label="Console carousel">
          {consoles.map((entry, index) => {
            const offset = carouselOffset(index);
            const distance = Math.abs(offset);
            const style = {
              "--offset": offset,
              "--distance": distance,
              "--scale": offset === 0 ? 1 : Math.max(.58, 1 - distance * .2),
              zIndex: 10 - distance,
            } as CSSProperties;
            return (
              <button
                className={`carousel-card${offset === 0 ? " selected" : ""}${distance > 2 ? " far" : ""}`}
                key={entry.id}
                style={style}
                onClick={() => setSelected(index)}
                aria-label={`Show ${entry.name}`}
                aria-current={offset === 0 ? "true" : undefined}
                aria-hidden={distance > 2}
                tabIndex={distance > 2 ? -1 : 0}
              >
                <Artwork src={entry.imagePath} alt="" />
              </button>
            );
          })}
        </div>

        <div className="hero-copy">
          <p className="eyebrow">{current.company} · {date(current.releaseDate, true)}</p>
          <h1>{current.name}</h1>
          <dl>
            <div><dt>Released</dt><dd>{date(current.releaseDate)}</dd></div>
            <div><dt>By</dt><dd>{current.company || "Unknown"}</dd></div>
          </dl>

          <nav className="console-controls" aria-label="Choose a console">
            <button onClick={() => move(-1)} aria-label="Previous">←</button>
            <div className="console-dots">
              {consoles.map((entry, index) => {
                const isActive = index === selected;
                return <button className={isActive ? "active" : ""} key={entry.id} onClick={() => setSelected(index)} aria-label={`Show ${entry.name}`} aria-current={isActive ? "true" : undefined} />;
              })}
            </div>
            <button onClick={() => move(1)} aria-label="Next">→</button>
          </nav>
          <div className="tabs" role="group" aria-label="Collection type">
            <button className={kind === "game" ? "active" : ""} onClick={() => setKind("game")}>Games</button>
            <button className={kind === "accessory" ? "active" : ""} onClick={() => setKind("accessory")}>Accessories</button>
          </div>
        </div>
      </section>

      <section className="collection" aria-label={`${current.name} collection`}>
        <div className="item-list">
            {visibleItems.map((item) => {
              const original = consoles.find((console) => console.id === item.originalConsoleId);
              return (
                <details key={item.id} name={`${current.id}-${kind}`}>
                  <summary>
                    <Artwork src={item.imagePath} alt="" />
                    <span>{item.name}</span>
                    <time dateTime={item.releaseDate}>{date(item.releaseDate, true)}</time>
                  </summary>
                  <div className="item-details">
                    <dl>
                      <div><dt>Released</dt><dd>{date(item.releaseDate)}</dd></div>
                      <div><dt>By</dt><dd>{item.company || "Unknown"}</dd></div>
                      {kind === "game" && original && <div><dt>Console</dt><dd>{original.name} ({date(original.releaseDate, true)})</dd></div>}
                    </dl>
                  </div>
                </details>
              );
            })}
            {!visibleItems.length && <p className="empty">No {kind === "game" ? "games" : "accessories"} added yet.</p>}
        </div>
      </section>
    </main>
  );
}
