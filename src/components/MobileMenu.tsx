"use client";

import { useState, type ReactNode } from "react";
import { Menu, X, LogOut } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  section?: "admin";
};

export function MobileMenu({
  items,
  userName,
  userRole,
  onSignOut,
}: {
  items: NavItem[];
  userName: string;
  userRole: string;
  onSignOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const mainItems = items.filter((i) => i.section !== "admin");
  const adminItems = items.filter((i) => i.section === "admin");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="flex items-center justify-center rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
      >
        <Menu className="h-6 w-6" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-brand-navy text-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="text-[11px] uppercase tracking-wide text-brand-gold">
                  {userRole}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
              {mainItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                    item.active
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </a>
              ))}

              {adminItems.length > 0 && (
                <>
                  <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    Administración
                  </div>
                  {adminItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                        item.active
                          ? "bg-white/10 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </a>
                  ))}
                </>
              )}
            </nav>

            <div className="border-t border-white/10 px-3 py-4">
              <form action={onSignOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
