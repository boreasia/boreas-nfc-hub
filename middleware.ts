import { NextRequest, NextResponse } from "next/server";

// Protección mínima para /admin: como es un solo administrador (tú), no
// justifica un sistema de login completo. Basic Auth vía el navegador es
// suficiente y no requiere UI de login propia.
export function middleware(request: NextRequest) {
  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    // Si no configuraste credenciales, no bloqueamos (útil en desarrollo local),
    // pero se recomienda encarecidamente configurarlas antes de producción.
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const [user, password] = decoded.split(":");
      if (user === adminUser && password === adminPassword) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Autenticación requerida.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Boreas NFC Hub Admin"' },
  });
}

// También protegemos las rutas de API que mutan/leen datos administrativos:
// el matcher de Next solo cubre /admin/:path* por defecto, pero esas rutas
// se llaman por fetch() directo (sin pasar por el middleware de /admin), así
// que sin esto cualquiera podría, por ejemplo, POSTear a /api/chips/activate
// sin autenticarse. Dejamos fuera /api/feedback (lo llama el cliente final
// desde la ruta pública /r/[chip_code]) y /api/chips/:chip_code/qr (solo
// genera una imagen de un código que ya es público).
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/chips/activate",
    "/api/chips/update",
    "/api/chips/lookup",
    "/api/chips/metrics",
    "/api/clients",
    "/api/clients/:path*",
  ],
};
