import express from 'express'

import contentRouter from './api/contentRouter.js'

const router = express.Router()

router.use('/content', contentRouter)

export default router