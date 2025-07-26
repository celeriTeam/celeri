import postgres from 'postgres'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL || 'localhost:3000'
const sql = postgres(connectionString)

export default sql