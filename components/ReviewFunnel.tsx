"use client";

import { useState } from "react";
import { Star, Send, CheckCircle2, Loader2 } from "lucide-react";
import BoreasBrandmark from "./BoreasBrandmark";

interface ReviewFunnelProps {
  chipId: string;
  businessName: string;
  logoUrl: string | null;
  destinationUrl: string;
}

type Stage = "rating" | "redirecting" | "feedback_form" | "feedback_sent";

export default function ReviewFunnel({
  chipId,
  businessName,
  logoUrl,
  destinationUrl,
}: ReviewFunnelProps) {
  const [stage, setStage] = useState<Stage>("rating");
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleStarClick(rating: number) {
    setSelectedRating(rating);

    if (rating >= 4) {
      setStage("redirecting");
      window.setTimeout(() => {
        window.location.href = destinationUrl;
      }, 800);
    } else {
      setStage("feedback_form");
    }
  }

  async function handleSubmitFeedback() {
    if (!selectedRating) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chip_id: chipId,
          rating: selectedRating,
          comment,
          customer_contact: phone || null,
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo enviar el mensaje");
      }

      setStage("feedback_sent");
    } catch (err) {
      setSubmitError("Hubo un problema enviando tu mensaje. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-boreas-navy-deep px-6 py-12">
      {/* Glow ambiental de fondo, sutil, propio de la identidad Boreas */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(123,79,191,0.6) 0%, rgba(74,179,232,0.25) 45%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {stage === "rating" && (
          <div className="flex flex-col items-center text-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={businessName}
                className="mb-6 h-20 w-20 rounded-2xl object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-boreas-navy text-2xl font-bold text-white/70 ring-1 ring-white/10">
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}

            <p className="text-sm uppercase tracking-[0.2em] text-boreas-cyan/80">{businessName}</p>
            <h1 className="mt-3 font-cormorant text-3xl font-semibold text-white">
              ¿Cómo fue tu experiencia hoy?
            </h1>

            <div className="mt-8 flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoveredStar ?? selectedRating ?? 0) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                    onClick={() => handleStarClick(star)}
                    className="transition-transform duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-boreas-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-boreas-navy-deep"
                  >
                    <Star
                      size={40}
                      strokeWidth={1.5}
                      className={
                        isFilled
                          ? "fill-boreas-cyan text-boreas-cyan drop-shadow-[0_0_8px_rgba(74,179,232,0.6)]"
                          : "text-white/25"
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {stage === "redirecting" && (
          <div className="flex flex-col items-center text-center">
            <Loader2 size={36} className="animate-spin text-boreas-cyan" />
            <p className="mt-4 text-white/70">Gracias, te llevamos a dejar tu reseña…</p>
          </div>
        )}

        {stage === "feedback_form" && (
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-white">
              Gracias por contarnos. ¿Qué podemos mejorar?
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Esto se envía directo al equipo de {businessName}, en privado.
            </p>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuéntanos qué pasó…"
              rows={4}
              className="mt-5 w-full resize-none rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-boreas-violet focus:outline-none focus:ring-1 focus:ring-boreas-violet"
            />

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Tu WhatsApp (opcional, por si quieren responderte)"
              className="mt-3 w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-boreas-violet focus:outline-none focus:ring-1 focus:ring-boreas-violet"
            />

            {submitError && <p className="mt-3 text-sm text-red-400">{submitError}</p>}

            <button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={submitting || comment.trim().length === 0}
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-boreas-violet px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Enviar mensaje privado
            </button>
          </div>
        )}

        {stage === "feedback_sent" && (
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 size={44} className="text-boreas-cyan" />
            <h2 className="mt-4 text-xl font-semibold text-white">Mensaje enviado</h2>
            <p className="mt-2 text-sm text-white/50">
              El equipo de {businessName} lo va a leer. Gracias por tomarte el tiempo.
            </p>
          </div>
        )}
      </div>

      <footer className="relative z-10 mt-12 flex flex-col items-center gap-1.5 opacity-50">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Powered by</p>
        <BoreasBrandmark size="small" />
      </footer>
    </main>
  );
}
