"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";

interface LogoUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
}

// Reemplaza el campo "Logo (URL, opcional)": en campo, desde el celular, no
// hay forma cómoda de conseguir un link a una foto recién tomada. Este input
// de archivo sube directo a /api/upload/logo (bucket "logos" en Supabase
// Storage) y deja el resultado en el mismo `value`/`onChange` que antes tenía
// el input de texto, así que encaja en ClientEditForm e InstallerExpress sin
// tocar el resto del formulario.
export default function LogoUploadField({ value, onChange }: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/logo", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body.error ?? "No se pudo subir la imagen.");

      onChange(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
        Logo (opcional)
      </label>

      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-boreas-navy">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Logo del comercio" className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Quitar logo"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-boreas-navy-deep text-white/70 ring-1 ring-white/20 hover:text-white"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/15 text-white/20">
            <Upload size={18} />
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Subiendo…" : value ? "Cambiar imagen" : "Subir imagen (PNG, JPG)"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
