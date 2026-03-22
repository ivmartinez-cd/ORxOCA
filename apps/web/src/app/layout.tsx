import type { ReactNode } from "react";

export const metadata = {
  title: "OR x OCA",
  description: "Generacion rapida de ordenes OCA"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
