"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./rapido.module.css";

type QuickUser = {
  id: number;
  displayName: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  floor: string;
  apartment: string;
  cp: string;
  locality: string;
  province: string;
  notes: string;
};

type UsersResponse = {
  ok: boolean;
  data: QuickUser[];
};

type CreateSimpleResponse = {
  ok: boolean;
  remito?: string;
  idOrdenRetiro?: string | null;
  numeroEnvio?: string | null;
  labelBase64?: string | null;
  labelFileName?: string | null;
  labelDownloaded?: boolean;
  error?: string;
  responsePreview?: string;
};

type OrderDraft = {
  remito: string;
  pickup: {
    fecha: string;
    contacto: string;
    calle: string;
    numero: string;
    piso: string;
    depto: string;
    cp: string;
    localidad: string;
    provincia: string;
    email: string;
    solicitante: string;
    observaciones: string;
    idCentroImposicionOrigen: string;
  };
  recipient: {
    apellido: string;
    nombre: string;
    calle: string;
    numero: string;
    piso: string;
    depto: string;
    cp: string;
    localidad: string;
    provincia: string;
    telefono: string;
    email: string;
    idci: string;
    celular: string;
    observaciones: string;
  };
  packageData: {
    altoCm: number;
    anchoCm: number;
    largoCm: number;
    pesoKg: number;
    valorDeclarado: number;
    cantidad: number;
  };
};

function defaultRemito(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function todayIsoDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function createDraftFromUser(user: QuickUser): OrderDraft {
  return {
    remito: defaultRemito(),
    pickup: {
      fecha: todayIsoDate(),
      contacto: user.displayName,
      calle: user.street,
      numero: user.number,
      piso: user.floor,
      depto: user.apartment,
      cp: user.cp,
      localidad: user.locality,
      provincia: user.province,
      email: user.email,
      solicitante: "",
      observaciones: user.notes || "Retirar 1 bulto - Respetar fecha de retiro generada.",
      idCentroImposicionOrigen: ""
    },
    recipient: {
      apellido: "Corigliano",
      nombre: "Juan Pablo",
      calle: "Francisco Narciso de Laprida",
      numero: "3160",
      piso: "",
      depto: "",
      cp: "1603",
      localidad: "V.MARTELLI",
      provincia: "BUENOS AIRES",
      telefono: "1131133225",
      email: "jpcorigliano@canaldirecto.com.ar",
      idci: "",
      celular: "1131133225",
      observaciones: "Retirar 1 bulto - Respetar fecha de retiro generada."
    },
    packageData: {
      altoCm: 15,
      anchoCm: 40,
      largoCm: 30,
      pesoKg: 3,
      valorDeclarado: 0,
      cantidad: 1
    }
  };
}

function validateMax(value: string, max: number): boolean {
  return value.trim().length <= max;
}

function requiredFilled(value: string): boolean {
  return value.trim().length > 0;
}

function validateDraftClient(draft: OrderDraft): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.pickup.fecha)) {
    return "Origen fecha: formato invalido (debe ser AAAA-MM-DD).";
  }
  if (!requiredFilled(draft.pickup.calle) || !validateMax(draft.pickup.calle, 30)) {
    return "Origen calle: obligatorio y maximo 30 caracteres.";
  }
  if (!requiredFilled(draft.pickup.numero) || !validateMax(draft.pickup.numero, 5)) {
    return "Origen nro: obligatorio y maximo 5 caracteres.";
  }
  if (!validateMax(draft.pickup.piso, 2)) {
    return "Origen piso: maximo 2 caracteres.";
  }
  if (!validateMax(draft.pickup.depto, 4)) {
    return "Origen depto: maximo 4 caracteres.";
  }
  if (!requiredFilled(draft.pickup.cp) || !validateMax(draft.pickup.cp, 4)) {
    return "Origen CP: obligatorio y maximo 4 caracteres.";
  }
  if (!requiredFilled(draft.pickup.localidad) || !validateMax(draft.pickup.localidad, 30)) {
    return "Origen localidad: obligatorio y maximo 30 caracteres.";
  }
  if (!requiredFilled(draft.pickup.provincia) || !validateMax(draft.pickup.provincia, 30)) {
    return "Origen provincia: obligatorio y maximo 30 caracteres.";
  }
  if (!validateMax(draft.pickup.contacto, 30)) {
    return "Origen contacto: maximo 30 caracteres.";
  }
  if (!requiredFilled(draft.pickup.email) || !validateMax(draft.pickup.email, 100)) {
    return "Origen email: obligatorio y maximo 100 caracteres.";
  }
  if (!validateMax(draft.pickup.solicitante, 30)) {
    return "Origen solicitante: maximo 30 caracteres.";
  }
  if (!requiredFilled(draft.pickup.observaciones) || !validateMax(draft.pickup.observaciones, 100)) {
    return "Origen observaciones: obligatorio y maximo 100 caracteres.";
  }
  if (!validateMax(draft.pickup.idCentroImposicionOrigen, 3)) {
    return "Origen idcentroimposicionorigen: maximo 3 caracteres.";
  }
  if (!/^\d{4}$/.test(draft.pickup.cp)) {
    return "Origen CP: debe ser numerico de 4 digitos.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.pickup.email.trim())) {
    return "Origen email: formato invalido.";
  }

  if (!requiredFilled(draft.recipient.apellido) || !validateMax(draft.recipient.apellido, 30)) {
    return "Destinatario apellido: obligatorio y maximo 30 caracteres.";
  }
  if (!requiredFilled(draft.recipient.nombre) || !validateMax(draft.recipient.nombre, 30)) {
    return "Destinatario nombre: obligatorio y maximo 30 caracteres.";
  }
  if (!requiredFilled(draft.recipient.calle) || !validateMax(draft.recipient.calle, 30)) {
    return "Destinatario calle: obligatorio y maximo 30 caracteres.";
  }
  if (!requiredFilled(draft.recipient.numero) || !validateMax(draft.recipient.numero, 5)) {
    return "Destinatario nro: obligatorio y maximo 5 caracteres.";
  }
  if (!validateMax(draft.recipient.piso, 6)) {
    return "Destinatario piso: maximo 6 caracteres.";
  }
  if (!validateMax(draft.recipient.depto, 4)) {
    return "Destinatario depto: maximo 4 caracteres.";
  }
  if (!requiredFilled(draft.recipient.localidad) || !validateMax(draft.recipient.localidad, 30)) {
    return "Destinatario localidad: obligatorio y maximo 30 caracteres.";
  }
  if (!requiredFilled(draft.recipient.provincia) || !validateMax(draft.recipient.provincia, 30)) {
    return "Destinatario provincia: obligatorio y maximo 30 caracteres.";
  }
  if (!requiredFilled(draft.recipient.cp) || !validateMax(draft.recipient.cp, 4)) {
    return "Destinatario CP: obligatorio y maximo 4 caracteres.";
  }
  if (!validateMax(draft.recipient.telefono, 30)) {
    return "Destinatario telefono: maximo 30 caracteres.";
  }
  if (!validateMax(draft.recipient.email, 100)) {
    return "Destinatario email: maximo 100 caracteres.";
  }
  if (!validateMax(draft.recipient.idci, 3)) {
    return "Destinatario idci: maximo 3 caracteres.";
  }
  if (draft.recipient.idci.trim() && !/^\d{1,3}$/.test(draft.recipient.idci.trim())) {
    return "Destinatario idci: debe ser numerico (1-3 digitos).";
  }
  if (!validateMax(draft.recipient.celular, 15)) {
    return "Destinatario celular: maximo 15 caracteres.";
  }
  if (!validateMax(draft.recipient.observaciones, 100)) {
    return "Destinatario observaciones: maximo 100 caracteres.";
  }
  if (!/^\d{4}$/.test(draft.recipient.cp)) {
    return "Destinatario CP: debe ser numerico de 4 digitos.";
  }
  if (draft.recipient.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.recipient.email.trim())) {
    return "Destinatario email: formato invalido.";
  }
  if (
    draft.pickup.idCentroImposicionOrigen.trim() &&
    !/^\d{1,3}$/.test(draft.pickup.idCentroImposicionOrigen.trim())
  ) {
    return "Origen idcentroimposicionorigen: debe ser numerico (1-3 digitos).";
  }

  if (
    draft.packageData.altoCm <= 0 ||
    draft.packageData.anchoCm <= 0 ||
    draft.packageData.largoCm <= 0 ||
    draft.packageData.pesoKg <= 0 ||
    draft.packageData.cantidad <= 0
  ) {
    return "Paquete: medidas, peso y cantidad deben ser mayores a 0.";
  }
  if (draft.packageData.valorDeclarado < 0) {
    return "Paquete: valor declarado no puede ser negativo.";
  }

  return null;
}

export default function RapidoPage() {
  const router = useRouter();
  const [users, setUsers] = useState<QuickUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [result, setResult] = useState<CreateSimpleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    async function loadUsers() {
      const response = await fetch("/api/quick-users");
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const data = (await response.json()) as UsersResponse;
      if (data.ok) {
        setUsers(data.data);
      }
    }
    void loadUsers();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function handlePreload() {
    if (!selectedUser) return;
    setResult(null);
    setDownloadMessage("");
    setModalError("");
    setDraft(createDraftFromUser(selectedUser));
    setShowModal(true);
  }

  function updateDraftField(path: string, value: string) {
    setDraft((current) => {
      if (!current) return current;

      if (path.startsWith("pickup.")) {
        const key = path.replace("pickup.", "") as keyof OrderDraft["pickup"];
        return { ...current, pickup: { ...current.pickup, [key]: value } };
      }
      if (path.startsWith("recipient.")) {
        const key = path.replace("recipient.", "") as keyof OrderDraft["recipient"];
        return { ...current, recipient: { ...current.recipient, [key]: value } };
      }
      if (path.startsWith("packageData.")) {
        const key = path.replace("packageData.", "") as keyof OrderDraft["packageData"];
        const numeric = Number(value);
        return {
          ...current,
          packageData: {
            ...current.packageData,
            [key]: Number.isFinite(numeric) ? numeric : 0
          }
        };
      }
      if (path === "remito") {
        return { ...current, remito: value };
      }
      return current;
    });
  }

  async function handleCreateFromModal() {
    if (!selectedUserId || !draft) return;
    setLoading(true);
    setResult(null);
    setDownloadMessage("");
    const validationError = validateDraftClient(draft);
    if (validationError) {
      setModalError(validationError);
      setLoading(false);
      return;
    }
    setModalError("");

    const response = await fetch("/api/pickups/create-simple", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        quickUserId: Number(selectedUserId),
        remito: draft.remito,
        pickupOverride: draft.pickup,
        recipientOverride: draft.recipient,
        packageOverride: draft.packageData
      })
    });
    if (response.status === 401) {
      router.push("/login");
      return;
    }

    const data = (await response.json()) as CreateSimpleResponse;
    setResult(data);
    setLoading(false);

    if (data.ok && data.labelBase64) {
      const binary = atob(data.labelBase64);
      const bytes = new Uint8Array(binary.length);
      for (let idx = 0; idx < binary.length; idx += 1) {
        bytes[idx] = binary.charCodeAt(idx);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = data.labelFileName ?? `etiqueta-${data.numeroEnvio ?? data.idOrdenRetiro ?? "oca"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setDownloadMessage("Etiqueta solicitada correctamente.");
    } else if (data.ok) {
      setDownloadMessage("OR creada, pero OCA no devolvio la etiqueta PDF para descarga automatica.");
    }

    if (data.ok) {
      setShowModal(false);
    }
  }

  const selectedUser = users.find((user) => String(user.id) === selectedUserId);

  return (
    <main className={styles.main}>
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div className={styles.headerRow}>
            <h1>Panel de Ordenes de Retiro</h1>
            <button className={styles.logoutButton} onClick={handleLogout}>
              Cerrar sesion
            </button>
          </div>
          <p>Selecciona usuaria, revisa datos y confirma la carga de OR.</p>
        </header>

        <section className={styles.section}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="quick-user">Usuaria de retiro *</label>
              <select
                id="quick-user"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                <option value="">Seleccionar usuaria</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button onClick={handlePreload} disabled={!selectedUserId || loading}>
              Pre cargar OR
            </button>
          </div>
        </section>
      </section>

      {showModal && draft ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h2>Pre carga OR</h2>
            {modalError ? <p className={styles.error}>{modalError}</p> : null}

            <section className={styles.modalSection}>
              <div className={styles.modalGrid}>
                <label>
                  Remito (generado)
                  <input
                    maxLength={30}
                    readOnly
                    value={draft.remito}
                  />
                </label>
                <label>
                  Fecha retiro OCA *
                  <input
                    type="date"
                    required
                    value={draft.pickup.fecha}
                    onChange={(event) => updateDraftField("pickup.fecha", event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className={styles.modalSection}>
              <h3 className={styles.modalSectionTitle}>Retiro del paquete</h3>
              <div className={styles.modalGrid}>
                <label>
                  Contacto
                  <input
                    maxLength={30}
                    value={draft.pickup.contacto}
                    onChange={(event) => updateDraftField("pickup.contacto", event.target.value)}
                  />
                </label>
                <label>
                  Calle *
                  <input
                    required
                    maxLength={30}
                    value={draft.pickup.calle}
                    onChange={(event) => updateDraftField("pickup.calle", event.target.value)}
                  />
                </label>
                <label>
                  Numero *
                  <input
                    required
                    maxLength={5}
                    value={draft.pickup.numero}
                    onChange={(event) => updateDraftField("pickup.numero", event.target.value)}
                  />
                </label>
                <label>
                  Piso
                  <input
                    maxLength={2}
                    value={draft.pickup.piso}
                    onChange={(event) => updateDraftField("pickup.piso", event.target.value)}
                  />
                </label>
                <label>
                  Depto
                  <input
                    maxLength={4}
                    value={draft.pickup.depto}
                    onChange={(event) => updateDraftField("pickup.depto", event.target.value)}
                  />
                </label>
                <label>
                  CP *
                  <input
                    required
                    maxLength={4}
                    value={draft.pickup.cp}
                    onChange={(event) => updateDraftField("pickup.cp", event.target.value)}
                  />
                </label>
                <label>
                  Localidad *
                  <input
                    required
                    maxLength={30}
                    value={draft.pickup.localidad}
                    onChange={(event) => updateDraftField("pickup.localidad", event.target.value)}
                  />
                </label>
                <label>
                  Provincia *
                  <input
                    required
                    maxLength={30}
                    value={draft.pickup.provincia}
                    onChange={(event) => updateDraftField("pickup.provincia", event.target.value)}
                  />
                </label>
                <label>
                  Email *
                  <input
                    required
                    maxLength={100}
                    value={draft.pickup.email}
                    onChange={(event) => updateDraftField("pickup.email", event.target.value)}
                  />
                </label>
                <label>
                  Observaciones *
                  <input
                    required
                    maxLength={100}
                    value={draft.pickup.observaciones}
                    onChange={(event) => updateDraftField("pickup.observaciones", event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className={styles.modalSection}>
              <h3 className={styles.modalSectionTitle}>Destinatario</h3>
              <div className={styles.modalGrid}>
                <label>
                  Apellido *
                  <input
                    required
                    maxLength={30}
                    value={draft.recipient.apellido}
                    onChange={(event) => updateDraftField("recipient.apellido", event.target.value)}
                  />
                </label>
                <label>
                  Nombre *
                  <input
                    required
                    maxLength={30}
                    value={draft.recipient.nombre}
                    onChange={(event) => updateDraftField("recipient.nombre", event.target.value)}
                  />
                </label>
                <label>
                  Calle *
                  <input
                    required
                    maxLength={30}
                    value={draft.recipient.calle}
                    onChange={(event) => updateDraftField("recipient.calle", event.target.value)}
                  />
                </label>
                <label>
                  Numero *
                  <input
                    required
                    maxLength={5}
                    value={draft.recipient.numero}
                    onChange={(event) => updateDraftField("recipient.numero", event.target.value)}
                  />
                </label>
                <label>
                  Piso
                  <input
                    maxLength={6}
                    value={draft.recipient.piso}
                    onChange={(event) => updateDraftField("recipient.piso", event.target.value)}
                  />
                </label>
                <label>
                  Depto
                  <input
                    maxLength={4}
                    value={draft.recipient.depto}
                    onChange={(event) => updateDraftField("recipient.depto", event.target.value)}
                  />
                </label>
                <label>
                  CP *
                  <input
                    required
                    maxLength={4}
                    value={draft.recipient.cp}
                    onChange={(event) => updateDraftField("recipient.cp", event.target.value)}
                  />
                </label>
                <label>
                  Localidad *
                  <input
                    required
                    maxLength={30}
                    value={draft.recipient.localidad}
                    onChange={(event) => updateDraftField("recipient.localidad", event.target.value)}
                  />
                </label>
                <label>
                  Provincia *
                  <input
                    required
                    maxLength={30}
                    value={draft.recipient.provincia}
                    onChange={(event) => updateDraftField("recipient.provincia", event.target.value)}
                  />
                </label>
                <label>
                  Telefono
                  <input
                    maxLength={30}
                    value={draft.recipient.telefono}
                    onChange={(event) => updateDraftField("recipient.telefono", event.target.value)}
                  />
                </label>
                <label>
                  Email
                  <input
                    maxLength={100}
                    value={draft.recipient.email}
                    onChange={(event) => updateDraftField("recipient.email", event.target.value)}
                  />
                </label>
                <label>
                  Celular
                  <input
                    maxLength={15}
                    value={draft.recipient.celular}
                    onChange={(event) => updateDraftField("recipient.celular", event.target.value)}
                  />
                </label>
                <label>
                  Observaciones
                  <input
                    maxLength={100}
                    value={draft.recipient.observaciones}
                    onChange={(event) => updateDraftField("recipient.observaciones", event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className={styles.modalSection}>
              <h3 className={styles.modalSectionTitle}>Paquete</h3>
              <div className={styles.modalGrid}>
                <label>
                  Alto (cm)
                  <input
                    type="number"
                    min={1}
                    value={draft.packageData.altoCm}
                    onChange={(event) => updateDraftField("packageData.altoCm", event.target.value)}
                  />
                </label>
                <label>
                  Ancho (cm)
                  <input
                    type="number"
                    min={1}
                    value={draft.packageData.anchoCm}
                    onChange={(event) => updateDraftField("packageData.anchoCm", event.target.value)}
                  />
                </label>
                <label>
                  Largo (cm)
                  <input
                    type="number"
                    min={1}
                    value={draft.packageData.largoCm}
                    onChange={(event) => updateDraftField("packageData.largoCm", event.target.value)}
                  />
                </label>
                <label>
                  Peso (kg)
                  <input
                    type="number"
                    min={1}
                    value={draft.packageData.pesoKg}
                    onChange={(event) => updateDraftField("packageData.pesoKg", event.target.value)}
                  />
                </label>
                <label>
                  Valor declarado
                  <input
                    type="number"
                    min={0}
                    value={draft.packageData.valorDeclarado}
                    onChange={(event) => updateDraftField("packageData.valorDeclarado", event.target.value)}
                  />
                </label>
                <label>
                  Cantidad
                  <input
                    type="number"
                    min={1}
                    value={draft.packageData.cantidad}
                    onChange={(event) => updateDraftField("packageData.cantidad", event.target.value)}
                  />
                </label>
              </div>
            </section>

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  setShowModal(false);
                  setModalError("");
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button onClick={handleCreateFromModal} disabled={loading}>
                {loading ? "Cargando..." : "Cargar OR"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {result ? (
        <section className={styles.section}>
          <h2>Resultado</h2>
          {!result.ok ? <p>Error: {result.error ?? result.responsePreview}</p> : null}
          {result.ok ? (
            <ul>
              <li>Remito: {result.remito}</li>
              <li>Orden de retiro: {result.idOrdenRetiro ?? "-"}</li>
              <li>Numero de envio: {result.numeroEnvio ?? "-"}</li>
            </ul>
          ) : null}
          {downloadMessage ? <p>{downloadMessage}</p> : null}
        </section>
      ) : null}
    </main>
  );
}
