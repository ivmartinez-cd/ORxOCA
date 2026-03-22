"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

type LoginResponse = {
  ok: boolean;
  error?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    const data = (await response.json()) as LoginResponse;
    setLoading(false);

    if (!response.ok || !data.ok) {
      setError(data.error ?? "No se pudo iniciar sesion.");
      return;
    }

    router.push("/rapido");
    router.refresh();
  }

  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1>OR x OCA</h1>
          <p>Acceso interno</p>
        </header>

        <form className={styles.content} onSubmit={handleSubmit}>
          {error ? <p className={styles.error}>{error}</p> : null}
          <label htmlFor="password">
            Contraseña
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}
