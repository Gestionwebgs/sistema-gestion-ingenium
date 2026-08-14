import Image from "next/image";
import { FolderKanban, LogOut } from "lucide-react";
import { signOut } from "@/auth";

type AppShellProps = {
  userName: string;
  userRole: string;
  children: React.ReactNode;
};

export function AppShell({ userName, userRole, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-brand-navy text-white">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white p-1">
            <Image
              src="/logo.png"
              alt="Ingenium Service SAC"
              width={32}
              height={32}
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold">Ingenium</p>
            <p className="text-[11px] tracking-wide text-white/60">
              SERVICE SAC
            </p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          <a
            href="/"
            className="flex items-center gap-3 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white"
          >
            <FolderKanban className="h-4 w-4" strokeWidth={1.75} />
            Proyectos
          </a>
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="text-[11px] uppercase tracking-wide text-brand-gold">
              {userRole}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}
