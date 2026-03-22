import argparse
import csv
import json
import time
import urllib.parse
import urllib.request


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def normalize_spaces(value: str) -> str:
    return " ".join((value or "").split()).strip()


def fetch_state(query: str, delay_seconds: float) -> str:
    params = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": "1",
        "limit": "1",
        "countrycodes": "ar",
    }
    url = f"{NOMINATIM_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "orxoca-province-enricher/1.0 (contact: local-script)",
            "Accept": "application/json",
        },
    )

    with urllib.request.urlopen(req, timeout=25) as response:
        data = json.loads(response.read().decode("utf-8"))

    time.sleep(delay_seconds)

    if not data:
        return ""

    address = data[0].get("address", {})
    state = (
        address.get("state")
        or address.get("province")
        or address.get("region")
        or address.get("state_district")
        or ""
    )
    return normalize_spaces(state)


def run(input_path: str, output_path: str, unresolved_path: str, delay_seconds: float) -> None:
    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    city_cache: dict[str, str] = {}
    enriched = 0
    unresolved: list[dict[str, str]] = []

    for row in rows:
        city = normalize_spaces(row.get("locality", ""))
        street = normalize_spaces(row.get("street", ""))
        number = normalize_spaces(row.get("number", ""))
        cp = normalize_spaces(row.get("cp", ""))

        if not city:
            unresolved.append({"display_name": row.get("display_name", ""), "reason": "locality vacia"})
            continue

        if city in city_cache:
            state = city_cache[city]
        else:
            state = fetch_state(f"{city}, Argentina", delay_seconds=delay_seconds)
            if not state and street:
                address_query = f"{street} {number}, {city}, {cp}, Argentina".strip(", ")
                state = fetch_state(address_query, delay_seconds=delay_seconds)
            city_cache[city] = state

        if state:
            row["province"] = state
            enriched += 1
        else:
            unresolved.append(
                {
                    "display_name": row.get("display_name", ""),
                    "city": city,
                    "street": street,
                    "number": number,
                    "cp": cp,
                    "reason": "sin resultado geocoding",
                }
            )

    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    with open(unresolved_path, "w", newline="", encoding="utf-8-sig") as f:
        if unresolved:
            fieldnames = unresolved[0].keys()
        else:
            fieldnames = ["display_name", "reason"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(unresolved)

    print(f"OK: total={len(rows)} enriquecidos={enriched} sin_provincia={len(unresolved)}")
    print(f"Salida: {output_path}")
    print(f"Sin resolver: {unresolved_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", default="quick_users_normalizado_geo.csv")
    parser.add_argument("--unresolved", default="quick_users_geo_unresolved.csv")
    parser.add_argument("--delay", type=float, default=1.0)
    args = parser.parse_args()

    run(args.input, args.output, args.unresolved, args.delay)


if __name__ == "__main__":
    main()
