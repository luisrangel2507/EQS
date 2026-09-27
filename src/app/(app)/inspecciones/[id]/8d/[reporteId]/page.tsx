import Editor8DClient from "./Editor8DClient";

export default function Reporte8DPage({ params }: { params: { id: string; reporteId: string } }) {
  return <Editor8DClient inspeccionId={params.id} reporteId={params.reporteId} />;
}
