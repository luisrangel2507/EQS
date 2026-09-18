export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inspecciones/:path*",
    "/usuarios/:path*",
    "/reportes/:path*",
  ],
};
