"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

export default function NumeroAnimado({
  valor,
  decimales = 0,
  formato,
  duracion = 0.8,
}: {
  valor: number;
  decimales?: number;
  formato?: (n: number) => string;
  duracion?: number;
}) {
  const reducir = useReducedMotion();
  const [mostrado, setMostrado] = useState(reducir ? valor : 0);
  const previo = useRef(reducir ? valor : 0);

  useEffect(() => {
    if (reducir) {
      setMostrado(valor);
      previo.current = valor;
      return;
    }
    const control = animate(previo.current, valor, {
      duration: duracion,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setMostrado,
    });
    previo.current = valor;
    return () => control.stop();
  }, [valor, duracion, reducir]);

  const texto = formato
    ? formato(mostrado)
    : mostrado.toLocaleString("es-MX", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      });

  return <span className="tabular-nums">{texto}</span>;
}
