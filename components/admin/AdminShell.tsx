"use client";

// Shell persistente de /admin: sidebar + topbar alrededor de las páginas
// (Resumen, Clientes, Chips, Reseñas y feedback, Configuración). Vive en
// app/admin/layout.tsx para que el sidebar no se vuelva a montar al navegar
// entre esas páginas — solo cambia el contenido de `children`.
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutGrid,
  Building2,
  Nfc,
  MessageCircleWarning,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
  Zap,
  Loader2,
} from "lucide-react";
import OwlMark from "@/components/OwlMark";

const NAV_ITEMS = [
  { href: "/admin", label: "Resumen", icon: LayoutGrid },
  { href: "/admin/negocios", label: "Clientes", icon: Building2 },
  { href: "/admin/sin-activar", label: "Chips", icon: Nfc },
  { href: "/admin/feedback", label: "Reseñas y feedback", icon: MessageCircleWarning },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "text-boreas-cream" : "text-boreas-cream/55 hover:bg-boreas-cream/5 hover:text-boreas-cream/85"
      }`}
    >
      {active && (
        <motion.span
          layoutId="admin-nav-active"
          className="absolute inset-0 rounded-xl bg-boreas-brick"
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
        />
      )}
      <Icon size={17} className="relative z-10 shrink-0" />
      <span className="relative z-10 truncate">{label}</span>
    </Link>
  );
}

function SidebarContent({ adminUser, onNavigate }: { adminUser: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <OwlMark size={26} />
        <div className="leading-none">
          <p className="font-cormorant text-lg font-semibold text-boreas-cream">BOREAS</p>
          <p className="text-[9px] uppercase tracking-[0.25em] text-boreas-mustard">NFC HUB</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-boreas-cream/10 px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-boreas-brick/20 text-sm font-semibold text-boreas-brick-bright">
          {adminUser.charAt(0).toUpperCase()}
        </div>
        <p className="min-w-0 flex-1 truncate text-sm text-boreas-cream/80">{adminUser}</p>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-boreas-cream/40 hover:bg-boreas-cream/10 hover:text-boreas-cream/70"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

function QuickActivate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function handleGo() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chips/lookup?chip_code=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Chip no encontrado.");
      }
      const data = await res.json();
      setOpen(false);
      setCode("");
      router.push(`/admin/activar/${encodeURIComponent(data.chip.chip_code)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Nuevo cliente"
        className="focus-gradient btn-gradient-brand flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] sm:px-3.5"
      >
        <Plus size={15} /> <span className="hidden sm:inline">Nuevo cliente</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="glass-panel absolute right-0 top-full z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl p-3"
          >
            <p className="mb-2 text-xs text-boreas-cream/50">
              Un cliente nuevo se crea activando uno de sus chips. Escribe el código:
            </p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGo()}
                placeholder="BOREAS-001"
                autoFocus
                className="flex-1 rounded-lg border border-boreas-cream/10 bg-boreas-surface px-3 py-2 font-mono text-sm text-boreas-cream placeholder:text-boreas-cream/40 focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
              />
              <button
                type="button"
                onClick={handleGo}
                disabled={loading}
                className="flex items-center justify-center rounded-lg bg-boreas-brick px-3 text-white disabled:opacity-40"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-status-negative">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const RANGE_OPTIONS = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 d" },
  { value: "30d", label: "30 d" },
] as const;

function RangeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const [range, setRange] = useState<string>("7d");

  // El selector solo tiene efecto real en Resumen (ahí se lee el query
  // param) — leerlo de la URL al entrar para no perder la selección al
  // navegar y volver.
  useEffect(() => {
    const url = new URL(window.location.href);
    setRange(url.searchParams.get("range") ?? "7d");
  }, [pathname]);

  function select(value: string) {
    setRange(value);
    router.push(`/admin?range=${value}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-boreas-cream/10 bg-boreas-surface p-1">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => select(opt.value)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
            range === opt.value
              ? "bg-boreas-brick text-white"
              : "text-boreas-cream/50 hover:bg-boreas-cream/5 hover:text-boreas-cream/80"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminShell({ adminUser, children }: { adminUser: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  function handleSearch() {
    const trimmed = search.trim();
    if (!trimmed) return;
    router.push(`/admin/negocios?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="min-h-[100dvh] bg-boreas-ink">
      <div
        aria-hidden
        className="glow-orb-brand pointer-events-none fixed -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full opacity-15 blur-3xl"
      />

      {/* Sidebar — fijo en desktop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-boreas-cream/10 bg-boreas-surface/40 backdrop-blur-xl md:block">
        <SidebarContent adminUser={adminUser} />
      </aside>

      {/* Sidebar — slide-over en móvil */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-30 bg-black/60 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className="fixed inset-y-0 left-0 z-40 w-64 bg-boreas-surface md:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-full text-boreas-cream/60 hover:bg-boreas-cream/10"
              >
                <X size={16} />
              </button>
              <SidebarContent adminUser={adminUser} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10 md:pl-60">
        {/* Topbar */}
        <header className="glass-bar sticky top-0 z-10 flex items-center gap-3 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-boreas-cream/70 hover:bg-boreas-cream/10 md:hidden"
          >
            <Menu size={18} />
          </button>

          {/* min-w-0 es lo que de verdad arregla el mobile: un hijo flex sin
              esto no puede encogerse más allá del ancho de su contenido, así
              que en una pantalla angosta el input empujaba al resto fuera de
              la pantalla en vez de achicarse. */}
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-boreas-cream/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Buscar cliente o chip…"
              className="w-full min-w-0 rounded-xl border border-boreas-cream/10 bg-boreas-surface py-2 pl-9 pr-3 text-sm text-boreas-cream placeholder:text-boreas-cream/40 focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
            />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {pathname === "/admin" && (
              <div className="hidden sm:block">
                <RangeSelector />
              </div>
            )}
            <QuickActivate />
          </div>
        </header>

        <main className="px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
