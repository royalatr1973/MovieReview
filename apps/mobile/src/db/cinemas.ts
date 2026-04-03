import type { SQLiteDatabase } from 'expo-sqlite';

export interface CinemaRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  address: string | null;
  chain: string | null;
  city: string;
  active: boolean;
  cachedAt: string;
}

export async function upsertCinema(
  db: SQLiteDatabase,
  cinema: Omit<CinemaRow, 'cachedAt'>
): Promise<void> {
  await db.runAsync(
    `INSERT INTO cinemas_cache (id, name, latitude, longitude, radius, address, chain, city, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       radius = excluded.radius,
       address = excluded.address,
       chain = excluded.chain,
       city = excluded.city,
       active = excluded.active,
       cached_at = datetime('now')`,
    cinema.id,
    cinema.name,
    cinema.latitude,
    cinema.longitude,
    cinema.radius,
    cinema.address ?? null,
    cinema.chain ?? null,
    cinema.city,
    cinema.active ? 1 : 0
  );
}

export async function bulkUpsertCinemas(
  db: SQLiteDatabase,
  cinemas: Omit<CinemaRow, 'cachedAt'>[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const cinema of cinemas) {
      await upsertCinema(db, cinema);
    }
  });
}

export async function getActiveCinemas(db: SQLiteDatabase): Promise<CinemaRow[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM cinemas_cache WHERE active = 1 ORDER BY name ASC`
  );
  return rows.map(mapRowToCinema);
}

export async function getCinemaById(
  db: SQLiteDatabase,
  id: string
): Promise<CinemaRow | null> {
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM cinemas_cache WHERE id = ?`,
    id
  );
  return row ? mapRowToCinema(row) : null;
}

export async function getCinemaCount(db: SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cinemas_cache WHERE active = 1`
  );
  return result?.count ?? 0;
}

function mapRowToCinema(row: any): CinemaRow {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    radius: row.radius,
    address: row.address,
    chain: row.chain,
    city: row.city,
    active: !!row.active,
    cachedAt: row.cached_at,
  };
}
