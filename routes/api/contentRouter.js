import Router from 'express'

import controller from '../../controllers/contentController.js'

const router = new Router()

router.post('/auto-generate', controller.autoGenerate)

export default router