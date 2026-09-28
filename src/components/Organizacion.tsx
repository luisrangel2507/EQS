"use client";

import { createContext, useContext } from "react";
import { EMPRESA_POR_OMISION, type EmpresaEmisora } from "@/lib/branding";

const OrganizacionContext = createContext<EmpresaEmisora>(EMPRESA_POR_OMISION);

export const OrganizacionProvider = OrganizacionContext.Provider;

/** Nombre de la organización (multi-empresa) de quien está en sesión. */
export const useOrganizacion = () => useContext(OrganizacionContext);
