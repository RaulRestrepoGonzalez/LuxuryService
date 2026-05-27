import { MongoClient, Db, ObjectId } from 'mongodb';
import 'dotenv/config';

export const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
export const dbName = process.env.MONGODB_DB || 'luxury_service';

let client: MongoClient;
let db: Db;

export async function connectDb(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(uri, {
    tls: true,
    tlsAllowInvalidCertificates: true,
    serverSelectionTimeoutMS: 10_000,
  });
  await client.connect();
  db = client.db(dbName);
  console.log(`MongoDB conectado: ${dbName}`);
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('Base de datos no inicializada');
  return db;
}

export { ObjectId };

export function toApiId(doc: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest };
}

export function toApiList(docs: Record<string, unknown>[]): Record<string, unknown>[] {
  return docs.map(d => toApiId(d)!);
}
