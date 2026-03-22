import { NextResponse } from "next/server";
import { OcaClient } from "@orxoca/carriers/src/oca/client";
import { isAuthenticatedRequest } from "../../../../lib/auth";
import { getQuickUserById } from "../../../../lib/db";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno obligatoria: ${name}`);
  }
  return value;
}

function formatTodayForOca(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function extractByTag(raw: string, tags: string[]): string | null {
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
    const match = raw.match(regex);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function hasBusinessError(rawResponse: string): boolean {
  const normalized = rawResponse.toLowerCase();
  return normalized.includes("error") || normalized.includes("errores");
}

function extractOcaBusinessError(rawXml: string): string | null {
  const candidates = [
    "DesError",
    "Descripcion",
    "Mensaje",
    "Message",
    "Detalle",
    "Error",
    "Errores"
  ];

  for (const tag of candidates) {
    const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
    const match = rawXml.match(regex);
    if (!match?.[1]) continue;
    const value = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (value && value.length <= 500 && !value.startsWith("<?xml")) {
      return value;
    }
  }

  const fallback = rawXml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

  return fallback || null;
}

function asText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

function validateField(name: string, value: string, maxLength: number, required: boolean): string | null {
  const normalized = value.trim();
  if (required && !normalized) {
    return `El campo ${name} es obligatorio.`;
  }
  if (normalized.length > maxLength) {
    return `El campo ${name} supera el maximo de ${maxLength} caracteres.`;
  }
  return null;
}

function validateEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateCp(value: string): boolean {
  return /^\d{4}$/.test(value.trim());
}

function validatePhone(value: string): boolean {
  if (!value.trim()) return true;
  return /^[0-9+\-()/\s]+$/.test(value.trim());
}

function normalizePickupDateToOca(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (/^\d{8}$/.test(normalized)) {
    return normalized;
  }

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, yyyy, mm, dd] = match;
  return `${yyyy}${mm}${dd}`;
}

function extractXmlValue(rawXml: string, tagNames: string[]): string | null {
  for (const tag of tagNames) {
    const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
    const match = rawXml.match(regex);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

async function fetchLabelPdfBase64(params: {
  idOrdenRetiro: string;
  nroEnvio?: string | null;
}): Promise<string | null> {
  const body = new URLSearchParams({
    idOrdenRetiro: params.idOrdenRetiro,
    nroEnvio: params.nroEnvio ?? "",
    logisticaInversa: process.env.OCA_LOGISTICA_INVERSA ?? "true"
  });

  const response = await fetch(
    "http://webservice.oca.com.ar/epak_tracking/Oep_TrackEPak.asmx/GetPdfDeEtiquetasPorOrdenOrNumeroEnvio",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (!response.ok) {
    return null;
  }

  const rawXml = await response.text();
  const value = extractXmlValue(rawXml, [
    "GetPdfDeEtiquetasPorOrdenOrNumeroEnvioResult",
    "string"
  ]);
  if (!value) {
    return null;
  }

  const normalized = decodeXmlEntities(value).replace(/\s+/g, "");
  if (!normalized) {
    return null;
  }

  try {
    const buffer = Buffer.from(normalized, "base64");
    if (buffer.length === 0 || !buffer.slice(0, 4).toString("utf-8").startsWith("%PDF")) {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticatedRequest())) {
      return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      quickUserId?: number;
      remito?: string;
      pickupOverride?: {
        fecha?: string;
        contacto?: string;
        calle?: string;
        numero?: string;
        piso?: string;
        depto?: string;
        cp?: string;
        localidad?: string;
        provincia?: string;
        email?: string;
        solicitante?: string;
        observaciones?: string;
        idCentroImposicionOrigen?: string;
      };
      recipientOverride?: {
        apellido?: string;
        nombre?: string;
        calle?: string;
        numero?: string;
        piso?: string;
        depto?: string;
        cp?: string;
        localidad?: string;
        provincia?: string;
        telefono?: string;
        email?: string;
        idci?: string;
        celular?: string;
        observaciones?: string;
      };
      packageOverride?: {
        altoCm?: number;
        anchoCm?: number;
        largoCm?: number;
        pesoKg?: number;
        valorDeclarado?: number;
        cantidad?: number;
      };
    };
    const quickUserId = Number(body.quickUserId);
    if (!Number.isFinite(quickUserId)) {
      return NextResponse.json({ ok: false, error: "quickUserId es obligatorio." }, { status: 400 });
    }

    const quickUser = await getQuickUserById(quickUserId);
    if (!quickUser || !quickUser.isActive) {
      return NextResponse.json({ ok: false, error: "Usuaria no encontrada o inactiva." }, { status: 404 });
    }

    const ocaClient = new OcaClient({
      username: requiredEnv("OCA_USERNAME"),
      password: requiredEnv("OCA_PASSWORD"),
      nroCuenta: requiredEnv("OCA_NRO_CUENTA"),
      centroCosto: requiredEnv("OCA_CENTRO_COSTO"),
      franjaHoraria: process.env.OCA_FRANJA_HORARIA ?? "1",
      centroImposicionOrigen: process.env.OCA_ID_CENTRO_IMPOSICION_ORIGEN ?? "0",
      confirmPickup: (process.env.OCA_CONFIRMAR_RETIRO ?? "true").toLowerCase() === "true"
    });

    const remito = body.remito?.trim() || formatTodayForOca();
    const pickupDateRaw = asText(body.pickupOverride?.fecha);
    const pickupFechaOca = normalizePickupDateToOca(pickupDateRaw) ?? formatTodayForOca();
    if (pickupDateRaw && !normalizePickupDateToOca(pickupDateRaw)) {
      return NextResponse.json(
        { ok: false, error: "Origen fecha invalida. Usar formato AAAA-MM-DD." },
        { status: 400 }
      );
    }

    const pickup = {
      calle: asText(body.pickupOverride?.calle) || quickUser.street,
      numero: asText(body.pickupOverride?.numero) || quickUser.number,
      piso: asText(body.pickupOverride?.piso) || quickUser.floor,
      depto: asText(body.pickupOverride?.depto) || quickUser.apartment,
      cp: asText(body.pickupOverride?.cp) || quickUser.cp,
      localidad: asText(body.pickupOverride?.localidad) || quickUser.locality,
      provincia: asText(body.pickupOverride?.provincia) || quickUser.province,
      contacto: asText(body.pickupOverride?.contacto) || quickUser.displayName,
      email: asText(body.pickupOverride?.email) || quickUser.email || requiredEnv("RETIRO_EMAIL_DEFAULT"),
      solicitante: asText(body.pickupOverride?.solicitante),
      observaciones:
        asText(body.pickupOverride?.observaciones) ||
        quickUser.notes ||
        process.env.RETIRO_OBSERVACIONES_DEFAULT ||
        "Retirar 1 bulto - Respetar fecha de retiro generada.",
      idCentroImposicionOrigen:
        asText(body.pickupOverride?.idCentroImposicionOrigen) ||
        process.env.OCA_ID_CENTRO_IMPOSICION_ORIGEN ||
        "0",
      fecha: pickupFechaOca
    };

    const recipient = {
      apellido: asText(body.recipientOverride?.apellido) || "Corigliano",
      nombre: asText(body.recipientOverride?.nombre) || "Juan Pablo",
      calle: asText(body.recipientOverride?.calle) || "Francisco Narciso de Laprida",
      numero: asText(body.recipientOverride?.numero) || "3160",
      piso: asText(body.recipientOverride?.piso),
      depto: asText(body.recipientOverride?.depto),
      cp: asText(body.recipientOverride?.cp) || "1603",
      localidad: asText(body.recipientOverride?.localidad) || "V.MARTELLI",
      provincia: asText(body.recipientOverride?.provincia) || "BUENOS AIRES",
      telefono: asText(body.recipientOverride?.telefono) || "1131133225",
      email: asText(body.recipientOverride?.email) || "jpcorigliano@canaldirecto.com.ar",
      idci: asText(body.recipientOverride?.idci) || "0",
      celular: asText(body.recipientOverride?.celular) || "1131133225",
      observaciones:
        asText(body.recipientOverride?.observaciones) || "Retirar 1 bulto - Respetar fecha de retiro generada."
    };

    const packageData = {
      altoCm: asNumber(body.packageOverride?.altoCm, 15),
      anchoCm: asNumber(body.packageOverride?.anchoCm, 40),
      largoCm: asNumber(body.packageOverride?.largoCm, 30),
      pesoKg: asNumber(body.packageOverride?.pesoKg, 3),
      valorDeclarado: asNumber(body.packageOverride?.valorDeclarado, 0),
      cantidad: asNumber(body.packageOverride?.cantidad, 1)
    };

    const validationErrors: string[] = [];
    const pushError = (error: string | null) => {
      if (error) validationErrors.push(error);
    };

    pushError(validateField("origen.calle", pickup.calle, 30, true));
    pushError(validateField("origen.nro", pickup.numero, 5, true));
    pushError(validateField("origen.piso", pickup.piso, 2, false));
    pushError(validateField("origen.depto", pickup.depto, 4, false));
    pushError(validateField("origen.cp", pickup.cp, 4, true));
    pushError(validateField("origen.localidad", pickup.localidad, 30, true));
    pushError(validateField("origen.provincia", pickup.provincia, 30, true));
    pushError(validateField("origen.contacto", pickup.contacto, 30, false));
    pushError(validateField("origen.email", pickup.email, 100, true));
    pushError(validateField("origen.solicitante", pickup.solicitante, 30, false));
    pushError(validateField("origen.observaciones", pickup.observaciones, 100, true));
    pushError(validateField("origen.idcentroimposicionorigen", pickup.idCentroImposicionOrigen, 3, false));

    pushError(validateField("destinatario.apellido", recipient.apellido, 30, true));
    pushError(validateField("destinatario.nombre", recipient.nombre, 30, true));
    pushError(validateField("destinatario.calle", recipient.calle, 30, true));
    pushError(validateField("destinatario.nro", recipient.numero, 5, true));
    pushError(validateField("destinatario.piso", recipient.piso, 6, false));
    pushError(validateField("destinatario.depto", recipient.depto, 4, false));
    pushError(validateField("destinatario.localidad", recipient.localidad, 30, true));
    pushError(validateField("destinatario.provincia", recipient.provincia, 30, true));
    pushError(validateField("destinatario.cp", recipient.cp, 4, true));
    pushError(validateField("destinatario.telefono", recipient.telefono, 30, false));
    pushError(validateField("destinatario.email", recipient.email, 100, false));
    pushError(validateField("destinatario.idci", recipient.idci, 3, false));
    pushError(validateField("destinatario.celular", recipient.celular, 15, false));
    pushError(validateField("destinatario.observaciones", recipient.observaciones, 100, false));

    if (!validateCp(pickup.cp)) {
      validationErrors.push("origen.cp debe ser numerico de 4 digitos.");
    }
    if (!validateCp(recipient.cp)) {
      validationErrors.push("destinatario.cp debe ser numerico de 4 digitos.");
    }
    if (!validateEmail(pickup.email)) {
      validationErrors.push("origen.email tiene formato invalido.");
    }
    if (!validateEmail(recipient.email)) {
      validationErrors.push("destinatario.email tiene formato invalido.");
    }
    if (!validatePhone(recipient.telefono)) {
      validationErrors.push("destinatario.telefono tiene caracteres invalidos.");
    }
    if (!validatePhone(recipient.celular)) {
      validationErrors.push("destinatario.celular tiene caracteres invalidos.");
    }

    if (packageData.altoCm <= 0 || packageData.anchoCm <= 0 || packageData.largoCm <= 0) {
      validationErrors.push("Las medidas del paquete deben ser mayores a 0.");
    }
    if (packageData.pesoKg <= 0) {
      validationErrors.push("El peso del paquete debe ser mayor a 0.");
    }
    if (packageData.cantidad <= 0) {
      validationErrors.push("La cantidad de paquetes debe ser mayor a 0.");
    }
    if (packageData.valorDeclarado < 0) {
      validationErrors.push("El valor declarado no puede ser negativo.");
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: validationErrors[0]
        },
        { status: 400 }
      );
    }

    const response = await ocaClient.createPickupOrder({
      idOperativa: Number(requiredEnv("OCA_ID_OPERATIVA")),
      nroRemito: remito,
      pickup,
      recipient,
      packageData
    });

    const ok = response.ok && !hasBusinessError(response.rawResponse);
    const idOrdenRetiro = extractByTag(response.rawResponse, ["OrdenRetiro", "idOrdenRetiro", "ordenRetiro"]);
    const numeroEnvio = extractByTag(response.rawResponse, ["NumeroEnvio", "numeroEnvio", "Pieza"]);
    const businessError = !ok ? extractOcaBusinessError(response.rawResponse) : null;
    const labelBase64 = ok && idOrdenRetiro
      ? await fetchLabelPdfBase64({
          idOrdenRetiro,
          nroEnvio: numeroEnvio
        })
      : null;

    return NextResponse.json({
      ok,
      remito,
      idOrdenRetiro,
      numeroEnvio,
      error: businessError,
      labelBase64,
      labelFileName: `etiqueta-${numeroEnvio ?? idOrdenRetiro ?? remito}.pdf`,
      labelDownloaded: Boolean(labelBase64),
      responsePreview: response.rawResponse.slice(0, 220)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
