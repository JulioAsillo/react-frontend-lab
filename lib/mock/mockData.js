/**
 * mockData.js — genera filas de datos ficticias para cada fuente de BD.
 * Retorna arrays de objetos con las columnas definidas en bdSources.js
 */

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rndDate = (y1=2020, y2=2026) => {
  const d = new Date(y1*365.25*86400000 + Math.random()*(y2-y1)*365.25*86400000);
  return d.toISOString().slice(0,10);
};
const NOMBRES = ["García","López","Martínez","Rodríguez","Hernández","Torres","Flores","Ramírez"];
const NOMBRES2 = ["Carlos","Ana","Luis","María","Jorge","Rosa","Pedro","Elena"];

export function makeRows(cols, n=20) {
  return Array.from({length: n}, (_, i) => {
    const row = {};
    cols.forEach(c => {
      const cl = c.toLowerCase();
      if (cl === "matricula" || cl === "id")      row[c] = `T${70000 + i}`;
      else if (cl === "usuario" || cl === "upn")  row[c] = `user${i+1}@empresa.com`;
      else if (cl === "nombre")                   row[c] = NOMBRES2[i % NOMBRES2.length];
      else if (cl === "apellido_paterno")          row[c] = NOMBRES[i % NOMBRES.length];
      else if (cl === "apellido_materno")          row[c] = NOMBRES[(i+3) % NOMBRES.length];
      else if (cl === "display_name" || cl === "full_name") row[c] = `${NOMBRES2[i%8]} ${NOMBRES[i%8]}`;
      else if (cl === "dni")                      row[c] = String(40000000 + i*1337);
      else if (cl === "u_organizativa")           row[c] = rnd(["RRHH","TI","Finanzas","Operaciones"]);
      else if (cl === "correo" || cl === "mail")  row[c] = `user${i+1}@empresa.com`;
      else if (cl === "rol")                      row[c] = rnd(["Operador","Admin","Lectura"]);
      else if (cl === "city")                     row[c] = rnd(["Lima","Arequipa","Trujillo"]);
      else if (cl === "creaction_type" || cl === "creation_type") row[c] = rnd(["Manual","Sync","Import"]);
      else if (cl === "grupos")                   row[c] = rnd(["GRP_OPS","GRP_ADMIN","GRP_AUDIT"]);
      else if (cl.includes("isactivo") || cl === "account_enabled") row[c] = rnd(["Si","No"]);
      else if (cl === "iscesado")                 row[c] = rnd(["Si","No"]);
      else if (cl === "exist_entra")              row[c] = rnd(["Si","No"]);
      else if (cl.includes("fecha") || cl.includes("date") || cl.includes("login") || cl.includes("time")) {
        row[c] = rndDate();
      }
      else row[c] = `valor_${i+1}`;
    });
    return row;
  });
}

import { BD_SOURCES } from "./bdSources";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBDStatus, setBDStatus } from "../store/uiStore";
import { idbGetItem, idbSetItem, idbDelItem } from "@/lib/storage";
import { exportSheetPlano } from "../utils/excel";

export function getMockData(sourceId) {
  const src = BD_SOURCES.find(s => s.id === sourceId);
  if (!src) return [];
  return makeRows(src.cols, 20);
}
