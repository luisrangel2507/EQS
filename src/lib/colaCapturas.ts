"use client";

import { useEffect, useState } from "react";
import { comprimirImagen } from "@/lib/imagen";

// Cola local de capturas para seguir trabajando sin señal en piso. Cada captura
// lleva un idCliente único: el servidor lo usa para no duplicar si un reintento
// llega dos veces. Las fotos se guardan en IndexedDB (localStorage no aguanta blobs).

export type CuerpoCaptura = {
  tipo: "buena" | "mala" | "retrabajo";
  cantidad: number;
  defecto?: string;
  fotoUrl?: string;
};

type CapturaEnCola = {
  idCliente: string;
  inspeccionId: string;
  cuerpo: CuerpoCaptura;
  tieneFoto: boolean;
  creadoEn: string;
};

export type ResultadoEnvio =
  | { estado: "enviada"; capturaId: string; avisoFoto?: string }
  | { estado: "encolada"; idCliente: string }
  | { estado: "error"; mensaje: string };

const CLAVE_COLA = "eqs_cola_capturas";
const EVENTO_COLA = "eqs-cola-capturas";
const DB_NOMBRE = "eqs-offline";
const DB_STORE = "fotos";

function leerCola(): CapturaEnCola[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_COLA) ?? "[]");
  } catch {
    return [];
  }
}

function guardarCola(cola: CapturaEnCola[]) {
  try {
    localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
  } catch {
    // sin espacio o sin localStorage: no hay más que hacer
  }
  window.dispatchEvent(new Event(EVENTO_COLA));
}

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function operarFoto<T>(modo: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>) {
  const db = await abrirDb();
  return new Promise<T>((resolve, reject) => {
    const req = op(db.transaction(DB_STORE, modo).objectStore(DB_STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const guardarFoto = (id: string, foto: Blob) => operarFoto("readwrite", (s) => s.put(foto, id));
const leerFoto = (id: string) => operarFoto<Blob | undefined>("readonly", (s) => s.get(id));
const borrarFoto = (id: string) => operarFoto("readwrite", (s) => s.delete(id));

function nuevoId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function subirFoto(foto: Blob): Promise<string> {
  const form = new FormData();
  form.append("foto", foto, (foto as File).name ?? "foto.jpg");
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new ErrorServidor(d.error ?? "No se pudo subir la foto");
  }
  return (await res.json()).url;
}

class ErrorServidor extends Error {}

async function postCaptura(inspeccionId: string, idCliente: string, cuerpo: CuerpoCaptura) {
  const res = await fetch(`/api/inspecciones/${inspeccionId}/capturas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...cuerpo, idCliente }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new ErrorServidor(d.error ?? "No se pudo registrar la captura");
  }
  return (await res.json()) as { id: string };
}

export async function enviarCaptura(
  inspeccionId: string,
  cuerpo: CuerpoCaptura,
  fotoOriginal?: File | null
): Promise<ResultadoEnvio> {
  const idCliente = nuevoId();
  const foto = fotoOriginal ? await comprimirImagen(fotoOriginal) : null;

  const encolar = async (): Promise<ResultadoEnvio> => {
    if (foto) {
      try {
        await guardarFoto(idCliente, foto);
      } catch {
        return { estado: "error", mensaje: "Sin conexión y no se pudo guardar la foto en el equipo" };
      }
    }
    guardarCola([
      ...leerCola(),
      { idCliente, inspeccionId, cuerpo, tieneFoto: Boolean(foto), creadoEn: new Date().toISOString() },
    ]);
    return { estado: "encolada", idCliente };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) return encolar();

  try {
    let fotoUrl: string | undefined;
    let avisoFoto: string | undefined;
    if (foto) {
      try {
        fotoUrl = await subirFoto(foto);
      } catch (error) {
        // la pieza NG se registra aunque la evidencia falle: perderla en piso es peor
        if (!(error instanceof ErrorServidor)) throw error;
        avisoFoto = error.message;
      }
    }
    const captura = await postCaptura(inspeccionId, idCliente, { ...cuerpo, fotoUrl });
    return { estado: "enviada", capturaId: captura.id, avisoFoto };
  } catch (error) {
    if (error instanceof ErrorServidor) return { estado: "error", mensaje: error.message };
    // TypeError de fetch = falla de red: se guarda para mandarla después
    return encolar();
  }
}

export function quitarDeCola(idCliente: string) {
  const cola = leerCola();
  const item = cola.find((c) => c.idCliente === idCliente);
  if (!item) return false;
  guardarCola(cola.filter((c) => c.idCliente !== idCliente));
  if (item.tieneFoto) borrarFoto(idCliente).catch(() => {});
  return true;
}

let sincronizando = false;

export async function sincronizarCola() {
  if (sincronizando || !navigator.onLine) return;
  sincronizando = true;
  try {
    for (const item of leerCola()) {
      try {
        let fotoUrl = item.cuerpo.fotoUrl;
        if (item.tieneFoto) {
          const foto = await leerFoto(item.idCliente);
          try {
            if (foto) fotoUrl = await subirFoto(foto);
          } catch (error) {
            // si el servidor rechaza la foto, la captura se guarda igual sin evidencia
            if (!(error instanceof ErrorServidor)) throw error;
          }
        }
        await postCaptura(item.inspeccionId, item.idCliente, { ...item.cuerpo, fotoUrl });
      } catch (error) {
        // falla de red: se reintenta en la siguiente vuelta
        if (!(error instanceof ErrorServidor)) break;
        // rechazo del servidor (p. ej. inspección cerrada): reintentar no sirve
        console.error("Captura descartada al sincronizar", item, error);
      }
      quitarDeCola(item.idCliente);
    }
  } finally {
    sincronizando = false;
  }
}

/** Estado de la cola + sincronización automática al recuperar señal. */
export function useColaCapturas(inspeccionId?: string) {
  const [cola, setCola] = useState<CapturaEnCola[]>([]);
  const [enLinea, setEnLinea] = useState(true);

  useEffect(() => {
    const actualizar = () => setCola(leerCola());
    const alConectar = () => {
      setEnLinea(true);
      sincronizarCola();
    };
    const alDesconectar = () => setEnLinea(false);

    actualizar();
    setEnLinea(navigator.onLine);
    sincronizarCola();

    window.addEventListener(EVENTO_COLA, actualizar);
    window.addEventListener("storage", actualizar);
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    const intervalo = setInterval(sincronizarCola, 15000);
    return () => {
      window.removeEventListener(EVENTO_COLA, actualizar);
      window.removeEventListener("storage", actualizar);
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
      clearInterval(intervalo);
    };
  }, []);

  const propias = inspeccionId ? cola.filter((c) => c.inspeccionId === inspeccionId) : cola;
  const pendientesBuenas = propias
    .filter((c) => c.cuerpo.tipo === "buena")
    .reduce((acc, c) => acc + c.cuerpo.cantidad, 0);
  const pendientesMalas = propias
    .filter((c) => c.cuerpo.tipo === "mala")
    .reduce((acc, c) => acc + c.cuerpo.cantidad, 0);

  return { pendientes: propias.length, pendientesBuenas, pendientesMalas, enLinea };
}
