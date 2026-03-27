import csv
import os
from pathlib import Path

import psycopg


ROOT = Path(__file__).resolve().parent
ENV_PATH = ROOT / "apps" / "web" / ".env.local"
CSV_PATH = ROOT / "quick_users_normalizado_geo_bom_comma.csv"


def read_database_url() -> str:
    from_env = os.environ.get("DATABASE_URL", "").strip()
    if from_env:
        return from_env

    if not ENV_PATH.exists():
        raise SystemExit(f"No existe archivo de entorno: {ENV_PATH}")

    with ENV_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            clean = line.strip()
            if not clean or clean.startswith("#"):
                continue
            if clean.startswith("DATABASE_URL="):
                return clean.split("=", 1)[1].strip()

    raise SystemExit("No se encontro DATABASE_URL en apps/web/.env.local")


def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"No existe CSV de importacion: {CSV_PATH}")

    database_url = read_database_url()
    inserted = 0

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS quick_users (
                  id BIGSERIAL PRIMARY KEY,
                  display_name TEXT NOT NULL,
                  email TEXT NOT NULL,
                  phone TEXT,
                  street TEXT NOT NULL,
                  number TEXT NOT NULL,
                  floor TEXT,
                  apartment TEXT,
                  locality TEXT NOT NULL,
                  province TEXT NOT NULL,
                  cp TEXT NOT NULL,
                  notes TEXT,
                  is_active BOOLEAN NOT NULL DEFAULT TRUE,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
            cur.execute("TRUNCATE TABLE quick_users RESTART IDENTITY;")

            with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f, delimiter=",")
                for row in reader:
                    is_active = str(row.get("is_active", "1")).strip().lower() in (
                        "1",
                        "true",
                        "t",
                        "yes",
                    )
                    cur.execute(
                        """
                        INSERT INTO quick_users (
                          display_name, email, phone, street, number, floor, apartment,
                          locality, province, cp, notes, is_active
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            (row.get("display_name") or "").strip(),
                            (row.get("email") or "").strip(),
                            (row.get("phone") or "").strip(),
                            (row.get("street") or "").strip(),
                            (row.get("number") or "").strip(),
                            (row.get("floor") or "").strip(),
                            (row.get("apartment") or "").strip(),
                            (row.get("locality") or "").strip(),
                            (row.get("province") or "").strip(),
                            (row.get("cp") or "").strip(),
                            (row.get("notes") or "").strip(),
                            is_active,
                        ),
                    )
                    inserted += 1

            conn.commit()
            cur.execute("SELECT COUNT(*) FROM quick_users;")
            total = cur.fetchone()[0]

    print(f"Importacion OK. Insertados: {inserted}. Total quick_users: {total}.")


if __name__ == "__main__":
    main()
