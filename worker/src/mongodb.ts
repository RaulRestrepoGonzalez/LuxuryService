export interface MongoConfig {
  url: string;
  apiKey: string;
  dataSource: string;
  database: string;
}

let config: MongoConfig;

export function initMongo(cfg: MongoConfig) {
  config = cfg;
}

const FETCH_TIMEOUT = 3000;

async function action(action: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(`${config.url}/action/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify({
        dataSource: config.dataSource,
        database: config.database,
        ...body,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Data API ${action} ${res.status}: ${text}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function findOne(collection: string, filter: Record<string, unknown>, projection?: Record<string, number>) {
  return action('findOne', { collection, filter, projection });
}

export function find(collection: string, filter: Record<string, unknown> = {}, options?: { projection?: Record<string, number>; sort?: Record<string, number>; limit?: number }) {
  return action('find', { collection, filter, ...options });
}

export function insertOne(collection: string, document: Record<string, unknown>) {
  return action('insertOne', { collection, document });
}

export function updateOne(collection: string, filter: Record<string, unknown>, update: Record<string, unknown>, upsert = false) {
  return action('updateOne', { collection, filter, update, upsert });
}

export function deleteOne(collection: string, filter: Record<string, unknown>) {
  return action('deleteOne', { collection, filter });
}

export function aggregate(collection: string, pipeline: Record<string, unknown>[]) {
  return action('aggregate', { collection, pipeline });
}
