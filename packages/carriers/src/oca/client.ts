import type {
  CarrierClient,
  CreatePickupOrderInput,
  CreatePickupOrderOutput
} from "@orxoca/types/src/carrier";

type OcaClientConfig = {
  username: string;
  password: string;
  nroCuenta: string;
  centroCosto: string;
  franjaHoraria: string;
  centroImposicionOrigen: string;
  confirmPickup: boolean;
};

export class OcaClient implements CarrierClient {
  constructor(private readonly config: OcaClientConfig) {}

  async createPickupOrder(input: CreatePickupOrderInput): Promise<CreatePickupOrderOutput> {
    const xml = buildOcaXml(input, this.config);

    const body = new URLSearchParams({
      usr: this.config.username,
      psw: this.config.password,
      XML_Datos: xml,
      ConfirmarRetiro: String(this.config.confirmPickup),
      ArchivoCliente: "",
      ArchivoProceso: ""
    });

    const response = await fetch(
      "http://webservice.oca.com.ar/ePak_tracking/Oep_TrackEPak.asmx/IngresoORMultiplesRetiros",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      }
    );

    return {
      ok: response.ok,
      rawResponse: await response.text()
    };
  }
}

function buildOcaXml(input: CreatePickupOrderInput, config: OcaClientConfig): string {
  const idCentroImposicionOrigen = input.pickup.idCentroImposicionOrigen ?? config.centroImposicionOrigen;
  const solicitante = input.pickup.solicitante ?? "";
  const idci = input.recipient.idci ?? "0";

  return `<?xml version="1.0" encoding="iso-8859-1" standalone="yes"?>
<ROWS>
  <cabecera ver="2.0" nrocuenta="${escapeXml(config.nroCuenta)}" />
  <origenes>
    <origen calle="${escapeXml(input.pickup.calle)}" nro="${escapeXml(input.pickup.numero)}" piso="${escapeXml(input.pickup.piso ?? "")}" depto="${escapeXml(input.pickup.depto ?? "")}" cp="${escapeXml(input.pickup.cp)}" localidad="${escapeXml(input.pickup.localidad)}" provincia="${escapeXml(input.pickup.provincia)}" contacto="${escapeXml(input.pickup.contacto ?? "")}" email="${escapeXml(input.pickup.email)}" solicitante="${escapeXml(solicitante)}" observaciones="${escapeXml(input.pickup.observaciones)}" centrocosto="${escapeXml(config.centroCosto)}" idfranjahoraria="${escapeXml(config.franjaHoraria)}" idcentroimposicionorigen="${escapeXml(idCentroImposicionOrigen)}" fecha="${escapeXml(input.pickup.fecha)}">
      <envios>
        <envio idoperativa="${input.idOperativa}" nroremito="${escapeXml(input.nroRemito)}">
          <destinatario apellido="${escapeXml(input.recipient.apellido)}" nombre="${escapeXml(input.recipient.nombre)}" calle="${escapeXml(input.recipient.calle)}" nro="${escapeXml(input.recipient.numero)}" piso="${escapeXml(input.recipient.piso ?? "")}" depto="${escapeXml(input.recipient.depto ?? "")}" localidad="${escapeXml(input.recipient.localidad)}" provincia="${escapeXml(input.recipient.provincia)}" cp="${escapeXml(input.recipient.cp)}" telefono="${escapeXml(input.recipient.telefono ?? "")}" email="${escapeXml(input.recipient.email ?? "")}" idci="${escapeXml(idci)}" celular="${escapeXml(input.recipient.celular ?? "")}" observaciones="${escapeXml(input.recipient.observaciones ?? "")}" />
          <paquetes>
            <paquete alto="${input.packageData.altoCm}" ancho="${input.packageData.anchoCm}" largo="${input.packageData.largoCm}" peso="${input.packageData.pesoKg}" valor="${input.packageData.valorDeclarado}" cant="${input.packageData.cantidad}" />
          </paquetes>
        </envio>
      </envios>
    </origen>
  </origenes>
</ROWS>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
