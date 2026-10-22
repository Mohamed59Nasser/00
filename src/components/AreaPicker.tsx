"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AREAS } from "@/lib/areas";
import { SearchIcon, XIcon } from "./icons";

interface AreaPickerProps {
  value: string[];
  onChange: (areas: string[]) => void;
  id?: string;
  placeholder?: string;
}

/** Type a few letters (e.g. "New") → matching areas appear → pick one or many. */
export function AreaPicker({ value, onChange, id, placeholder = "Type to search areas… e.g. New, Zayed, Maadi" }: AreaPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const selected = new Set(value.map((v) => v.toLowerCase()));
    const words = q.split(/\s+/);
    const matches = AREAS.filter((a) => {
      const lower = a.toLowerCase();
      return !selected.has(lower) && words.every((w) => lower.includes(w));
    });
    // Names that start with the query come first, then word-start matches, then the rest.
    const score = (a: string) => {
      const lower = a.toLowerCase();
      if (lower.startsWith(q)) return 0;
      if (lower.split(/[\s-]+/).some((w) => w.startsWith(words[0]))) return 1;
      return 2;
    };
    return matches.sort((a, b) => score(a) - score(b) || a.length - b.length).slice(0, 8);
  }, [query, value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function add(area: string) {
    if (!value.some((v) => v.toLowerCase() === area.toLowerCase())) onChange([...value, area]);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  }

  function remove(area: string) {
    onChange(value.filter((v) => v !== area));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Never submit the form from this field – Enter only picks a suggestion.
      e.preventDefault();
      if (open && suggestions[active]) add(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  const showList = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className="relative">
      <div
        className="flex min-h-[2.4rem] flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((area) => (
          <span
            key={area}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 py-0.5 pl-2 pr-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200"
          >
            {area}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(area);
              }}
              className="grid h-4 w-4 place-items-center rounded text-emerald-700 hover:bg-emerald-200"
              aria-label={`Remove ${area}`}
            >
              <XIcon size={11} />
            </button>
          </span>
        ))}
        <div className="flex min-w-[10rem] flex-1 items-center gap-1.5">
          {value.length === 0 && <SearchIcon size={15} className="text-slate-400" />}
          <input
            id={id}
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={value.length ? "Add another area…" : placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
            aria-controls={`${id ?? "area"}-listbox`}
            aria-autocomplete="list"
            className="w-full min-w-0 bg-transparent py-0.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {showList && (
        <ul
          ref={listRef}
          id={`${id ?? "area"}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-slate-900/5"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No area matches “{query.trim()}”.</li>
          ) : (
            suggestions.map((area, i) => (
              <li
                key={area}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(area);
                }}
                className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-emerald-50 text-emerald-900" : "text-slate-700"}`}
              >
                <Highlight text={area} query={query.trim()} />
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0 || !query) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-emerald-200/70 px-0 font-bold text-inherit">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
