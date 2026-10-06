import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/adminSession";

// Protección de /admin: antes era Basic Auth (prompt nativo del navegador);
// ahora es una pantalla de login propia (app/login) que deja una cookie
// firmada (lib/adminSession.ts). Sigue siendo un solo administrador — mismas
// credenciales ADMIN_USER/ADMIN_PASSWORD de siempre, solo cambia cómo se
// presenta y se recuerda la sesión (la cookie viaja sola en cada fetch() del
// mismo origen, así que las llamadas desde los paneles de /admin a las APIs
// de abajo siguen funcionando sin tocarlas).
export async function middleware(request: NextRequest) {
  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    // Si no configuraste credenciales, no bloqueamos (útil en desarrollo local),
    // pero se recomienda encarecidamente configurarlas antes de producción.
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  // Las rutas de API se llaman por fetch() desde dentro de /admin, no por
  // navegación del navegador: un 401 JSON es lo que el código que las llama
  // ya sabe interpretar. Las páginas sí navegan, así que a esas las mandamos
  // al login (con `next` para volver adonde el usuario iba).
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

// También protegemos las rutas de API que mutan/leen datos administrativos:
// el matcher de Next solo cubre /admin/:path* por defecto, pero esas rutas
// se llaman por fetch() directo (sin pasar por el middleware de /admin), así
// que sin esto cualquiera podría, por ejemplo, POSTear a /api/chips/activate
// sin autenticarse. Dejamos fuera /api/feedback (lo llama el cliente final
// desde la ruta pública /r/[chip_code]) y /api/chips/:chip_code/qr (solo
// genera una imagen de un código que ya es público). /login y /api/auth/*
// tampoco están en el matcher a propósito: si estuvieran, nadie podría ni
// cargar el login ni autenticarse.
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/chips/activate",
    "/api/chips/update",
    "/api/chips/lookup",
    "/api/chips/metrics",
    "/api/clients",
    "/api/clients/:path*",
    "/api/feedback/list",
    "/api/upload/:path*",
    "/api/stats/:path*",
  ],
};
