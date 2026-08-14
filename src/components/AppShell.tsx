import Image from "next/image";
import { FolderKanban, Camera, LogOut } from "lucide-react";
import { signOut } from "@/auth";

type AppShellProps = {
  userName: string;
  userRole: string;
  activeNav?: "proyectos" | "capturas";
  children: React.ReactNode;
};

export function AppShell({
  userName,
  userRole,
  activeNav = "proyectos",
  children,
}: AppShellProps) {
  const navLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  const SignOutButton = ({ className }: { className: string }) => (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button type="submit" className={className}>
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
        <span className="sr-only md:not-sr-only">Cerrar sesión</span>
      </button>
    </form>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Barra superior — solo en móvil */}
      <header className="flex shrink-0 items-center justify-between bg-brand-navy px-4 py-3 text-white md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white p-1">
            <Image src="/logo.png" alt="Ingenium Service SAC" width={24} height={24} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold">Ingenium</p>
          </div>
        </div>
        <SignOutButton className="flex items-center gap-1 rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white" />
      </header>

      {/* Sidebar — solo en desktop */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col bg-brand-navy text-white">
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
          <a href="/" className={navLinkClass(activeNav === "proyectos")}>
            <FolderKanban className="h-4 w-4" strokeWidth={1.75} />
            Proyectos
          </a>
          <a href="/capturas" className={navLinkClass(activeNav === "capturas")}>
            <Camera className="h-4 w-4" strokeWidth={1.75} />
            Facturas pendientes
          </a>
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="text-[11px] uppercase tracking-wide text-brand-gold">
              {userRole}
            </p>
          </div>
          <SignOutButton className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white" />
        </div>
      </aside>

      <main className="flex-1 bg-background pb-16 md:pb-0">{children}</main>

      {/* Barra inferior — solo en móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-brand-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <a
          href="/"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
            activeNav === "proyectos" ? "text-brand-blue" : "text-brand-muted"
          }`}
        >
          <FolderKanban className="h-5 w-5" strokeWidth={1.75} />
          Proyectos
        </a>
        <a
          href="/capturas"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
            activeNav === "capturas" ? "text-brand-blue" : "text-brand-muted"
          }`}
        >
          <Camera className="h-5 w-5" strokeWidth={1.75} />
          Facturas
        </a>
      </nav>
    </div>
  );
}
