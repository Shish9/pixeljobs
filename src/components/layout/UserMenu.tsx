"use client";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { signOutAction } from "@/app/[lang]/(auth)/actions";
import { useDisclosure } from "./useDisclosure";

type Props = {
  locale: string;
  name: string;
  avatar: string | null;
  isStaff: boolean;
  labels: { account: string; dashboard: string; settings: string; admin: string; signOut: string };
};

export function UserMenu({ locale, name, avatar, isStaff, labels }: Props) {
  const { open, setOpen, rootRef, buttonProps, panelId } = useDisclosure();
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        {...buttonProps}
        className="flex h-9 items-center gap-2 rounded-full border border-line ps-1 pe-2.5 text-sm font-semibold hover:border-line-strong"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- small user-uploaded avatar from Supabase storage
          <img src={avatar} alt="" className="size-7 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-brand-100 text-brand-700">
            {initial}
          </span>
        )}
        <span className="sr-only">{labels.account}</span>
        <span className="hidden max-w-32 truncate sm:inline">{name}</span>
        <ChevronDown className="size-4 text-ink-subtle" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute end-0 top-full z-50 mt-1.5 min-w-52 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-raised"
        >
          <Link onClick={close} href={`/${locale}/dashboard`} className="block px-3.5 py-2.5 text-sm hover:bg-sunken">
            {labels.dashboard}
          </Link>
          <Link onClick={close} href={`/${locale}/settings`} className="block px-3.5 py-2.5 text-sm hover:bg-sunken">
            {labels.settings}
          </Link>
          {isStaff && (
            <Link onClick={close} href={`/${locale}/admin`} className="block px-3.5 py-2.5 text-sm hover:bg-sunken">
              {labels.admin}
            </Link>
          )}
          <form action={signOutAction} className="border-t border-line">
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="block w-full px-3.5 py-2.5 text-start text-sm text-danger-700 hover:bg-sunken">
              {labels.signOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
