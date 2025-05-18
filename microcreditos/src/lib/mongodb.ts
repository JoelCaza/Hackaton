// src/lib/mongodb.ts
import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB_NAME; // Cambié el nombre para evitar confusión con el cliente

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

if (!MONGODB_DB) {
    throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env.local');
}

// En desarrollo, usamos una variable global para preservar el valor
// a través de recargas de módulos causadas por HMR (Hot Module Replacement).
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

interface ConnectToDatabaseResult {
    client: MongoClient;
    db: Db;
}

export async function connectToDatabase(): Promise<ConnectToDatabaseResult> {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(MONGODB_URI!); // El ! es para asegurar a TS que no será undefined aquí debido a la validación previa

    try {
        await client.connect();
        console.log("Successfully connected to MongoDB Atlas.");
        const db = client.db(MONGODB_DB!);

        cachedClient = client;
        cachedDb = db;

        return { client, db };
    } catch (e) {
        console.error("Failed to connect to MongoDB", e);
        // Si la conexión falla, no caches el cliente para intentar reconectar la próxima vez
        cachedClient = null;
        cachedDb = null;
        throw e; // Relanza el error para que el llamador lo maneje
    }
}