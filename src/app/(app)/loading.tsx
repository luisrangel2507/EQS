import { SkeletonPagina } from "@/components/ui/Skeleton";

// Next muestra esto en cuanto se toca un enlace, mientras el servidor arma la pantalla
// nueva; sin él, la app parece congelada hasta que llega la respuesta.
export default function Cargando() {
  return (
    <div data-cargando-ruta aria-busy="true">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
        <div className="barra-carga h-full w-full bg-yellow" />
      </div>
      <SkeletonPagina />
    </div>
  );
}
