"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface CatalogFilterCategory {
  id: string;
  slug: string;
  name: string;
}

const DEBOUNCE_MS = 350;

export default function CatalogFilters({
  categories,
}: {
  categories: CatalogFilterCategory[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Estado local controlado para reflejar lo que escribe el usuario al instante
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "recent");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si la URL cambia por fuera (ej. boton "Limpiar" o navegacion), re-sincroniza
  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setCategory(searchParams.get("category") ?? "");
    setSort(searchParams.get("sort") ?? "recent");
    setMinPrice(searchParams.get("minPrice") ?? "");
    setMaxPrice(searchParams.get("maxPrice") ?? "");
  }, [searchParams]);

  const pushFilters = useCallback(
    (next: {
      q: string;
      category: string;
      sort: string;
      minPrice: string;
      maxPrice: string;
    }) => {
      const params = new URLSearchParams();
      if (next.q.trim()) params.set("q", next.q.trim());
      if (next.category) params.set("category", next.category);
      if (next.sort && next.sort !== "recent") params.set("sort", next.sort);
      if (next.minPrice) params.set("minPrice", next.minPrice);
      if (next.maxPrice) params.set("maxPrice", next.maxPrice);
      // cualquier cambio de filtro vuelve a la pagina 1
      const queryString = params.toString();
      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  const scheduleUpdate = useCallback(
    (
      next: {
        q: string;
        category: string;
        sort: string;
        minPrice: string;
        maxPrice: string;
      },
      immediate = false,
    ) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (immediate) {
        pushFilters(next);
        return;
      }
      debounceRef.current = setTimeout(() => pushFilters(next), DEBOUNCE_MS);
    },
    [pushFilters],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const current = { q, category, sort, minPrice, maxPrice };

  const clearAll = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQ("");
    setCategory("");
    setSort("recent");
    setMinPrice("");
    setMaxPrice("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  };

  const hasFilters =
    q !== "" ||
    category !== "" ||
    sort !== "recent" ||
    minPrice !== "" ||
    maxPrice !== "";

  return (
    <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <label className="label" htmlFor="q">
          Buscar
        </label>
        <input
          id="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            scheduleUpdate({ ...current, q: e.target.value });
          }}
          placeholder="Nombre o descripcion"
          className="input"
          autoComplete="off"
        />
      </div>

      <div>
        <label className="label" htmlFor="category">
          Categoria
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            scheduleUpdate({ ...current, category: e.target.value }, true);
          }}
          className="input"
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="sort">
          Ordenar
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            scheduleUpdate({ ...current, sort: e.target.value }, true);
          }}
          className="input"
        >
          <option value="recent">Mas recientes</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="name">Nombre (A-Z)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="minPrice">
            Precio min
          </label>
          <input
            id="minPrice"
            type="number"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              scheduleUpdate({ ...current, minPrice: e.target.value });
            }}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="maxPrice">
            Precio max
          </label>
          <input
            id="maxPrice"
            type="number"
            min="0"
            step="0.01"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              scheduleUpdate({ ...current, maxPrice: e.target.value });
            }}
            className="input"
          />
        </div>
      </div>

      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-5">
        <span
          className={`text-xs text-slate-400 transition-opacity ${
            isPending ? "opacity-100" : "opacity-0"
          }`}
        >
          Actualizando resultados...
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="btn-secondary py-1.5"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
