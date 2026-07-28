"use client";

import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/Button";
import { SunIcon, MoonIcon } from "@/components/ui/icons";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Reads the value the pre-paint inline script (see app/layout.tsx) already
    // stamped onto <html data-theme> to avoid a flash of the wrong theme — this
    // is a one-time sync from that external DOM state on mount, not a derived
    // value computable from props/state, so it can't be hoisted out of an effect.
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current === "light" ? "light" : "dark");
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("vulcan-theme", next);
  };

  return (
    <IconButton label={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={toggle}>
      {mounted && theme === "dark" ? <SunIcon className="h-4.5 w-4.5" /> : <MoonIcon className="h-4.5 w-4.5" />}
    </IconButton>
  );
}
