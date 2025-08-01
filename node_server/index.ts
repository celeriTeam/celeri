import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import router from './queries/index.js'
import './jobs/stepSyncJob.js'; // This will start the step sync job in the background
import './config/firebaseAdmin.js'; // Initialize Firebase Admin

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/', router)

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})