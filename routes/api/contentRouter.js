import Router from 'express'

import controller from '../../controllers/contentController.js'

const router = new Router()

router.post('/auto-generate', controller.autoGenerate)

router.post('/clusters-description', controller.getClustersDescription)

// router.get('/render', controller.render)

export default router