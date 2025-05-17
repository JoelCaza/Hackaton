// src/lib/mongodb.ts
import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Define la variable de entorno MONGODB_URI');
}
if (!MONGODB_DB_NAME) {
  throw new Error('Define la variable de entorno MONGODB_DB_NAME');
}

// Caché de la conexión para evitar múltiples conexiones en desarrollo
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  const db = client.db(MONGODB_DB_NAME!);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}