import Image from "next/image";
import {
  FolderKanban,
  Camera,
  LogOut,
  Landmark,
  LayoutDashboard,
  Users,
  Receipt,
  ListChecks,
  Contact,
  FileText,
} from "lucide-react";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MobileMenu, type NavItem } from "@/components/MobileMenu";

type AppShellProps = {
  userName: string;
  userRole: string;
  activeNav?:
    | "proyectos"
    | "capturas"
    | "prestamos"
    | "prestamos-terceros"
    | "gastos"
    | "pendientes"
    | "cotizaciones"
    | "contactos"
    | "panel"
    | "usuarios";
  children: React.ReactNode;
};

export async function AppShell({
  userName,
  userRole,
  activeNav = "proyectos",
  children,
}: AppShellProps) {
  const isOwner = userRole === "OWNER";

  const session = await auth();
  const pendingCapturesCount = session?.user.id
    ? await prisma.expenseCapture.count({
        where: { capturedByUserId: session.user.id, status: "PENDIENTE" },
      })
    : 0;

  const iconClass = "h-4 w-4";
  const navItems: NavItem[] = [
    ...(isOwner
      ? ([
          {
            href: "/panel",
            label: "Panel general",
            icon: <LayoutDashboard className={iconClass} strokeWidth={1.75} />,
            active: activeNav === "panel",
          },
        ] satisfies NavItem[])
      : []),
    {
      href: "/proyectos",
      label: "Proyectos",
      icon: <FolderKanban className={iconClass} strokeWidth={1.75} />,
      active: activeNav === "proyectos",
    },
    {
      href: "/capturas",
      label: "Facturas pendientes",
      icon: <Camera className={iconClass} strokeWidth={1.75} />,
      active: activeNav === "capturas",
      badge: pendingCapturesCount,
    },
    ...(isOwner
      ? ([
          {
            href: "/prestamos",
            label: "Préstamos",
            icon: <Landmark className={iconClass} strokeWidth={1.75} />,
            active: activeNav === "prestamos",
          },
        ] satisfies NavItem[])
      : []),
    {
      href: "/prestamos-terceros",
      label: isOwner ? "Préstamos de terceros" : "Mis préstamos",
      icon: <Landmark className={iconClass} strokeWidth={1.75} />,
      active: activeNav === "prestamos-terceros",
    },
    ...(isOwner
      ? ([
          {
            href: "/pendientes",
            label: "Pendientes",
            icon: <ListChecks className={iconClass} strokeWidth={1.75} />,
            active: activeNav === "pendientes",
          },
          {
            href: "/cotizaciones",
            label: "Cotizaciones",
            icon: <FileText className={iconClass} strokeWidth={1.75} />,
            active: activeNav === "cotizaciones",
          },
        ] satisfies NavItem[])
      : []),
    ...(isOwner
      ? ([
          {
            href: "/gastos",
            label: "Gastos por mes",
            icon: <Receipt className={iconClass} strokeWidth={1.75} />,
            active: activeNav === "gastos",
            section: "admin",
          },
          {
            href: "/contactos",
            label: "Contactos",
            icon: <Contact className={iconClass} strokeWidth={1.75} />,
            active: activeNav === "contactos",
            section: "admin",
          },
          {
            href: "/usuarios",
            label: "Usuarios",
            icon: <Users className={iconClass} strokeWidth={1.75} />,
            active: activeNav === "usuarios",
            section: "admin",
          },
        ] satisfies NavItem[])
      : []),
  ];

  const navLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Barra superior — solo en móvil. El botón que abre el menú y el logo
          quedan juntos a la izquierda, del mismo lado por donde se despliega
          el panel. */}
      <header className="flex shrink-0 items-center gap-2 bg-brand-navy px-2 py-3 text-white md:hidden">
        <MobileMenu
          items={navItems}
          userName={userName}
          userRole={userRole}
          onSignOut={handleSignOut}
        />
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white p-1">
          <Image src="/logo.png" alt="Ingenium Service SAC" width={24} height={24} />
        </div>
        <p className="text-sm font-bold">Ingenium</p>
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
          {navItems
            .filter((i) => i.section !== "admin")
            .map((item) => (
              <a key={item.href} href={item.href} className={navLinkClass(item.active)}>
                {item.icon}
                {item.label}
                {!!item.badge && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </a>
            ))}

          {isOwner && (
            <>
              <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                Administración
              </div>
              {navItems
                .filter((i) => i.section === "admin")
                .map((item) => (
                  <a key={item.href} href={item.href} className={navLinkClass(item.active)}>
                    {item.icon}
                    {item.label}
                  </a>
                ))}
            </>
          )}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="text-[11px] uppercase tracking-wide text-brand-gold">
              {userRole}
            </p>
          </div>
          <form action={handleSignOut}>
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
