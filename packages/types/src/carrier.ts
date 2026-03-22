export type PickupAddress = {
  calle: string;
  numero: string;
  piso?: string;
  depto?: string;
  cp: string;
  localidad: string;
  provincia: string;
  contacto?: string;
  email: string;
  solicitante?: string;
  observaciones: string;
  idCentroImposicionOrigen?: string;
  fecha: string;
};

export type RecipientAddress = {
  apellido: string;
  nombre: string;
  calle: string;
  numero: string;
  piso?: string;
  depto?: string;
  cp: string;
  localidad: string;
  provincia: string;
  telefono?: string;
  email?: string;
  idci?: string;
  celular?: string;
  observaciones?: string;
};

export type PackageData = {
  altoCm: number;
  anchoCm: number;
  largoCm: number;
  pesoKg: number;
  valorDeclarado: number;
  cantidad: number;
};

export type CreatePickupOrderInput = {
  idOperativa: number;
  nroRemito: string;
  pickup: PickupAddress;
  recipient: RecipientAddress;
  packageData: PackageData;
};

export type CreatePickupOrderOutput = {
  ok: boolean;
  rawResponse: string;
};

export interface CarrierClient {
  createPickupOrder(input: CreatePickupOrderInput): Promise<CreatePickupOrderOutput>;
}
