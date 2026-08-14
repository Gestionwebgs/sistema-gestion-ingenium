import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#070759]">
            Ingenium Service SAC
          </h1>
          <p className="text-sm text-gray-500">
            {session?.user?.name} · {session?.user?.role}
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
            className="rounded-md border border-[#093e8c] px-3 py-1.5 text-sm text-[#093e8c] transition hover:bg-[#093e8c] hover:text-white"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      <p className="text-sm text-gray-600">
        Todavía no hay proyectos. Este será el listado de proyectos, cada uno
        con su propia pestaña.
      </p>
    </div>
  );
}
