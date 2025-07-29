import { Request, Response, Router } from 'express'

import competitionsRouter from './competitions.js'
import competitionStepsRouter from './competition_steps.js'

const router = Router()

router.use('/competition-steps', competitionStepsRouter)
router.use('/competitions', competitionsRouter)

router.get('/', (req, res) => {
  res.send('Server is up and running!')
})

export default router
