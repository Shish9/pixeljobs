"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useDisclosure } from "./useDisclosure";

export function MobileNav({
  label,
  closeLabel,
  links,
}: {
  label: string;
  closeLabel: string;
  links: { href: string; label: string }[];
}) {
  const { open, setOpen, rootRef, buttonProps, panelId } = useDisclosure();
  return (
    <div ref={rootRef} className="md:hidden">
      <button
        type="button"
        {...buttonProps}
        className="grid size-9 place-items-center rounded-md border border-line text-ink-muted hover:text-ink"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        <span className="sr-only">{open ? closeLabel : label}</span>
      </button>
      {open && (
        <nav id={panelId} aria-label={label} className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-raised">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link onClick={() => setOpen(false)} href={l.href} className="block rounded-md px-2 py-3 font-medium hover:bg-sunken">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
