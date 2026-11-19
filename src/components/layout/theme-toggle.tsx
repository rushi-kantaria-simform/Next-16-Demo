"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY } from "./theme-script";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
];

/** Fired after a write so every mounted toggle re-reads at once. */
const THEME_EVENT = "nexus-theme-change";

/**
 * localStorage as an external store.
 *
 * The obvious implementation — `useState` plus a `useEffect` that reads
 * localStorage on mount — trips `react-hooks/set-state-in-effect`, and the
 * rule is right: it renders once with the wrong value, then immediately again
 * with the right one.
 *
 * `useSyncExternalStore` is built for exactly this shape of problem. It takes
 * a separate server snapshot, so the server and the first client render agree
 * by construction, and React subscribes properly instead of us emulating a
 * subscription with an effect.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  // `storage` fires in OTHER tabs, keeping multiple tabs in sync for free.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : "system";
}

/**
 * The server cannot know the user's choice — it lives in localStorage, which
 * is why the inline ThemeScript exists at all. Returning "system" means the
 * server HTML and the first client render match, so hydration is clean; the
 * real value arrives on the next tick without a visual flash, because the
 * script already set the correct class on <html>.
 */
function getServerSnapshot(): Theme {
  return "system";
}

/** Apply a resolved theme to the document. Shared by the toggle and the OS listener. */
function paint(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);
  // Keeps native UI — scrollbars, form controls — in step with the palette.
  root.style.colorScheme = isDark ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const apply = useCallback((next: Theme) => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    paint(next === "dark" || (next === "system" && prefersDark));

    // "system" is the ABSENCE of a stored value, not a stored "system". That
    // keeps the inline script's logic trivial: a stored value is an explicit
    // override; nothing stored means defer to the OS.
    if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);

    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  // While on "system", follow the OS live. Without this, changing the OS theme
  // leaves the page stale until a reload.
  useEffect(() => {
    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => paint(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-muted p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => apply(value)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md transition-colors",
              selected
                ? "bg-surface-raised text-content shadow-sm"
                : "text-content-muted hover:text-content",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
