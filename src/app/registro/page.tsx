import type { Metadata } from "next";
import { NOMBRE_APP } from "@/lib/branding";
import { registroAbierto } from "@/lib/organizaciones";
import RegistroClient from "./RegistroClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: `Crear cuenta · ${NOMBRE_APP}` };

export default function RegistroPage() {
  return <RegistroClient abierto={registroAbierto()} />;
}
