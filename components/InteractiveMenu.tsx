"use client";

import { useMemo, useState } from "react";
import { FileText, ChevronDown, ShoppingCart, Plus, Minus } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface InteractiveMenuProps {
  chipId: string;
  businessName: string;
  logoUrl: string | null;
  menuPdfUrl: string | null;
  whatsappNumber: string;
}

// Placeholder de estructura: en producción esto vendría de una tabla
// `menu_categories` / `menu_items` filtrada por client_id. Se deja aquí
// como shape de referencia para que el cliente cargue su carta real.
const PLACEHOLDER_MENU: MenuCategory[] = [
  {
    id: "licores",
    name: "Licores",
    items: [
      { id: "l1", name: "Cerveza artesanal", description: "330ml, variedad rotativa", price: 14000 },
      { id: "l2", name: "Copa de vino tinto", description: "Cava reserva", price: 22000 },
    ],
  },
  {
    id: "fuertes",
    name: "Platos Fuertes",
    items: [
      { id: "f1", name: "Lomo al trapo", description: "Con papa criolla y chimichurri", price: 48000 },
      { id: "f2", name: "Risotto de champiñones", description: "Con parmesano añejo", price: 39000 },
    ],
  },
  {
    id: "postres",
    name: "Postres",
    items: [{ id: "p1", name: "Volcán de chocolate", description: "Con helado de vainilla", price: 18000 }],
  },
];

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function InteractiveMenu({
  businessName,
  logoUrl,
  menuPdfUrl,
  whatsappNumber,
}: InteractiveMenuProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(PLACEHOLDER_MENU[0]?.id ?? null);
  const [cart, setCart] = useState<Record<string, number>>({});

  const allItems = useMemo(() => PLACEHOLDER_MENU.flatMap((cat) => cat.items), []);

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = allItems.find((i) => i.id === itemId);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  function addToCart(itemId: string) {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => {
      const next = { ...prev };
      if (!next[itemId]) return prev;
      next[itemId] -= 1;
      if (next[itemId] <= 0) delete next[itemId];
      return next;
    });
  }

  function buildWhatsappLink() {
    const lines = Object.entries(cart).map(([itemId, qty]) => {
      const item = allItems.find((i) => i.id === itemId);
      return item ? `• ${qty}x ${item.name} — ${formatCOP(item.price * qty)}` : "";
    });
    const message = [
      `Hola, quiero hacer un pedido en ${businessName}:`,
      ...lines,
      "",
      `Total: ${formatCOP(cartTotal)}`,
    ].join("\n");

    const digits = whatsappNumber.replace(/\D/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  return (
    <main className="relative min-h-screen bg-boreas-navy-deep pb-28">
      <header className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={businessName} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-sm font-bold text-white/70">
            {businessName.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-base font-semibold text-white">{businessName}</h1>
      </header>

      {menuPdfUrl && (
        <div className="px-5 pt-5">
          <a
            href={menuPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-boreas-cyan/40 bg-boreas-cyan/10 px-4 py-3 text-sm font-semibold text-boreas-cyan"
          >
            <FileText size={16} />
            Ver menú en PDF
          </a>
        </div>
      )}

      <section className="px-5 py-6">
        {PLACEHOLDER_MENU.map((category) => {
          const isOpen = openCategory === category.id;
          return (
            <div key={category.id} className="mb-3 overflow-hidden rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setOpenCategory(isOpen ? null : category.id)}
                className="flex w-full items-center justify-between bg-white/5 px-4 py-3"
              >
                <span className="text-sm font-semibold text-white">{category.name}</span>
                <ChevronDown
                  size={16}
                  className={`text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen && (
                <div className="divide-y divide-white/5 bg-boreas-navy-deep">
                  {category.items.map((item) => {
                    const qty = cart[item.id] ?? 0;
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{item.name}</p>
                          <p className="truncate text-xs text-white/40">{item.description}</p>
                          <p className="mt-1 text-sm font-semibold text-boreas-cyan">
                            {formatCOP(item.price)}
                          </p>
                        </div>

                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => addToCart(item.id)}
                            className="flex shrink-0 items-center gap-1 rounded-lg bg-boreas-violet px-3 py-2 text-xs font-semibold text-white"
                          >
                            <Plus size={12} /> Agregar
                          </button>
                        ) : (
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-4 text-center text-sm text-white">{qty}</span>
                            <button
                              type="button"
                              onClick={() => addToCart(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-boreas-violet text-white"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-boreas-navy-deep/95 px-5 py-4 backdrop-blur">
          <a
            href={buildWhatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-boreas-cyan to-boreas-violet px-5 py-4 text-sm font-bold text-boreas-navy-deep shadow-[0_0_24px_rgba(74,179,232,0.35)]"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={16} />
              Ver pedido ({cartCount})
            </span>
            <span>{formatCOP(cartTotal)}</span>
          </a>
        </div>
      )}
    </main>
  );
}
