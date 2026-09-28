export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inspecciones/:path*",
    "/usuarios/:path*",
    "/reportes/:path*",
    "/estacion/:path*",
    "/residentes/:path*",
    "/empresas/:path*",
    "/turnos/:path*",
    "/ranking/:path*",
    "/facturacion/:path*",
    "/tv/:path*",
    "/salud/:path*",
    "/solicitudes/:path*",
    "/asistencia/:path*",
    "/certificaciones/:path*",
    "/auditorias/:path*",
    "/plataforma/:path*",
  ],
};
