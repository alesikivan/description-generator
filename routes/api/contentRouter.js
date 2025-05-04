import Router from 'express'

import controller from '../../controllers/contentController.js'
import { braavoRateLimiter, rateLimiter } from '../../middlewares/rateLimiter.js'
import { questionsGeneratorValidation } from '../validation/content.js'

const router = new Router()

router.post('/auto-generate', controller.autoGenerate)

router.post('/clipory-auto-generate', rateLimiter, controller.cliporyAutoGenerate)

router.post('/clusters-description', controller.getClustersDescription)

router.post(
  '/questions-generator', 
  braavoRateLimiter, 
  questionsGeneratorValidation,
  controller.questionsGenerator)

// router.get('/render', controller.render)

export default router