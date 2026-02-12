import { MongoClient } from 'mongodb'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'money_tracker_db'

if (!MONGO_URL) {
  throw new Error('Please define the MONGO_URL environment variable')
}

let client
let clientPromise

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGO_URL)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(MONGO_URL)
  clientPromise = client.connect()
}

export async function getDb() {
  const client = await clientPromise
  return client.db(DB_NAME)
}
