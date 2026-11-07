"use client";
import { useEffect, useId, useRef, useState } from "react";

/** Accessible disclosure: toggles on click, closes on Escape (returning focus) and on outside click. */
export function useDisclosure<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<T>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return {
    open,
    setOpen,
    rootRef,
    buttonProps: {
      ref: buttonRef,
      "aria-expanded": open,
      "aria-controls": panelId,
      onClick: () => setOpen((o) => !o),
    },
    panelId,
  };
}
