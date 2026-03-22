import { parse } from "csv-parse/sync";
import { z } from "zod";

const CsvRowSchema = z.object({
  external_id: z.string().min(1),
  retiro_apellido: z.string().optional(),
  retiro_nombre: z.string().optional(),
  retiro_calle: z.string().optional(),
  retiro_numero: z.string().optional(),
  retiro_localidad: z.string().optional(),
  retiro_provincia: z.string().optional(),
  retiro_cp: z.string().optional(),
  retiro_email: z.string().email().optional().or(z.literal("")),
  retiro_telefono: z.string().optional(),
  retiro_piso: z.string().optional(),
  retiro_depto: z.string().optional(),
  retiro_observaciones: z.string().optional(),
  alto_cm: z.coerce.number().positive(),
  ancho_cm: z.coerce.number().positive(),
  largo_cm: z.coerce.number().positive(),
  peso_kg: z.coerce.number().positive(),
  valor_declarado: z.coerce.number().min(0)
});

export type CsvRow = z.infer<typeof CsvRowSchema>;

type ValidationError = {
  row: number;
  message: string;
};

export function parseAndValidateCsv(csvText: string): {
  total: number;
  valid: CsvRow[];
  errors: ValidationError[];
} {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, string>[];

  const valid: CsvRow[] = [];
  const errors: ValidationError[] = [];

  records.forEach((record, index) => {
    const result = CsvRowSchema.safeParse(record);
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(" | ");
      errors.push({ row: index + 2, message });
      return;
    }

    valid.push(result.data);
  });

  return { total: records.length, valid, errors };
}
