import AuditoriaClient from "./AuditoriaClient";

export default function AuditoriaPage({ params }: { params: { id: string } }) {
  return <AuditoriaClient id={params.id} />;
}
