"use client";

import Papa from "papaparse";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Console = {
  id: string;
  name: string;
  releaseDate: string;
  company: string;
  imagePath: string;
};

const statuses = {
  owned: "Owned",
  wanted: "Wanted",
  "for-sale": "For Sale",
  incoming: "Incoming",
} as const;

type ItemStatus = keyof typeof statuses;

type Item = {
  id: string;
  type: "game" | "accessory";
  name: string;
  originalConsoleId: string;
  consoleIds: string;
  releaseDate: string;
  company: string;
  imagePath: string;
  status: ItemStatus;
};

const date = (value: string, yearOnly = false) => {
  if (!value) return "Unknown";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.valueOf())
    ? value
    : new Intl.DateTimeFormat(
        "en-US",
        yearOnly
          ? { year: "numeric" }
          : {
              month: "long",
              day: "numeric",
              year: "numeric",
            },
      ).format(parsed);
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
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === "owned") return null;
  return (
    <span className={`item-status ${status}`} tabIndex={0} aria-label={statuses[status]}>
      {status === "wanted" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 1 6m5-6-1 6M7 9 4 18m13-9 3 9M9 13h6"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/></svg>
      ) : status === "incoming" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10"/></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13 11 22l-9-9V4h9l9 9Z"/><circle cx="7" cy="9" r="1"/></svg>
      )}
      <span className="item-tooltip" role="tooltip">{statuses[status]}</span>
    </span>
  );
}

export default function Catalog() {
  const [consoles, setConsoles] = useState<Console[]>([]);
  const [allConsoles, setAllConsoles] = useState<Console[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState(0);
  const [kind, setKind] = useState<Item["type"]>("game");
  const [error, setError] = useState("");
  const pointerStart = useRef<number | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    Promise.all([
      loadCsv<Console>("/data/consoles.csv"),
      loadCsv<Item>("/data/items.csv"),
    ])
      .then(([nextConsoles, nextItems]) => {
        const invalid = nextItems.find((item) => !(item.status in statuses));
        if (invalid) throw new Error(`Invalid status for ${invalid.id}`);
        setAllConsoles(nextConsoles);
        setConsoles(
          nextConsoles
            .filter((console) =>
              nextItems.some(
                (item) =>
                  item.type === "game" &&
                  item.consoleIds.split("|").includes(console.id),
              ),
            )
            .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate)),
        );
        setItems(nextItems);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const current = consoles[selected];
  const visibleItems = useMemo(() => {
    if (!current) return [];
    return items
      .filter(
        (item) =>
          item.type === kind && item.consoleIds.split("|").includes(current.id),
      )
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  }, [current, items, kind]);
  const move = (amount: number) => {
    setSelected(
      (index) => (index + amount + consoles.length) % consoles.length,
    );
  };

  const carouselOffset = (index: number) => {
    let offset = index - selected;
    if (offset > consoles.length / 2) offset -= consoles.length;
    if (offset < -consoles.length / 2) offset += consoles.length;
    return offset;
  };

  if (error)
    return (
      <main className="status">
        <p>Couldn’t load the collection.</p>
        <small>{error}</small>
      </main>
    );
  if (!current)
    return <main className="status loading">Loading collection…</main>;

  return (
    <main>
      <header className="site-header">
        <div className="brand">
          <img src="/images/retrobin-mark.png" alt="" />
          RetroBin
        </div>
        <span>Console Archive</span>
      </header>
      <section className="hero" id="top">
        <div
          className="hero-art"
          aria-label="Console carousel"
          onClickCapture={(event) => {
            if (!dragged.current) return;
            event.preventDefault();
            event.stopPropagation();
            dragged.current = false;
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            pointerStart.current = event.clientX;
            dragged.current = false;
          }}
          onPointerMove={(event) => {
            if (
              pointerStart.current === null ||
              dragged.current ||
              Math.abs(event.clientX - pointerStart.current) <= 10
            )
              return;
            dragged.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (pointerStart.current === null) return;
            const distance = event.clientX - pointerStart.current;
            pointerStart.current = null;
            if (Math.abs(distance) > 50) move(distance > 0 ? -1 : 1);
          }}
          onPointerCancel={() => {
            pointerStart.current = null;
          }}
        >
          {consoles.map((entry, index) => {
            const offset = carouselOffset(index);
            const distance = Math.abs(offset);
            const style = {
              "--offset": offset,
              "--distance": distance,
              "--scale": offset === 0 ? 1 : Math.max(0.58, 1 - distance * 0.2),
              zIndex: 10 - distance,
            } as CSSProperties;
            return (
              <button
                className={`carousel-card${offset === 0 ? " selected" : ""}${distance > 1 ? " far" : ""}`}
                key={entry.id}
                style={style}
                onClick={() => offset === 0 ? document.getElementById("collection")?.scrollIntoView() : setSelected(index)}
                aria-label={offset === 0 ? `Browse ${entry.name} collection` : `Show ${entry.name}`}
                aria-current={offset === 0 ? "true" : undefined}
                aria-hidden={distance > 1}
                tabIndex={distance > 1 ? -1 : 0}
              >
                <Artwork src={entry.imagePath} alt="" />
              </button>
            );
          })}
          <button
            className="art-arrow previous"
            onClick={() => move(-1)}
            aria-label="Previous console"
          >
            ←
          </button>
          <button
            className="art-arrow next"
            onClick={() => move(1)}
            aria-label="Next console"
          >
            →
          </button>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">
            {current.company} · {date(current.releaseDate, true)}
          </p>
          <h1>{current.name}</h1>

          <nav className="console-controls" aria-label="Choose a console">
            <div className="console-dots">
              {consoles.map((entry, index) => {
                const isActive = index === selected;
                return (
                  <button
                    className={isActive ? "active" : ""}
                    key={entry.id}
                    onClick={() => setSelected(index)}
                    aria-label={`Show ${entry.name}`}
                    aria-current={isActive ? "true" : undefined}
                  />
                );
              })}
            </div>
          </nav>
        </div>
      </section>

      <section className="collection" id="collection" aria-label={`${current.name} collection`}>
        <div className="collection-toolbar">
          <div className="tabs" role="group" aria-label="Collection type">
            <button
              className={kind === "game" ? "active" : ""}
              onClick={() => setKind("game")}
            >
              Games
            </button>
            <button
              className={kind === "accessory" ? "active" : ""}
              onClick={() => setKind("accessory")}
            >
              Accessories
            </button>
          </div>
          <span>
            {visibleItems.length}{" "}
            {visibleItems.length === 1
              ? kind
              : kind === "game"
                ? "games"
                : "accessories"}
          </span>
        </div>
        <div className="item-list">
          {visibleItems.map((item) => {
            const original = allConsoles.find(
              (console) => console.id === item.originalConsoleId,
            );
            const badge = kind === "game" ? original?.name : item.company;
            return (
              <article className={`item-row${item.status === "wanted" || item.status === "incoming" ? " unavailable" : ""}`} key={item.id}>
                <Artwork src={item.imagePath} alt="" />
                <span className="item-name">
                  <strong>{item.name}</strong>
                  {badge && <small>{badge}</small>}
                </span>
                <span className="item-meta">
                  <StatusIcon status={item.status} />
                  <time dateTime={item.releaseDate}>
                    {date(item.releaseDate, true)}
                  </time>
                </span>
              </article>
            );
          })}
          {!visibleItems.length && (
            <p className="empty">
              No {kind === "game" ? "games" : "accessories"} added yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
