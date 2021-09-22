const router = require('express').Router()

const userRouter = require('./user')
const authRouter = require('./auth')
const gameplayRouter = require('./gameplay')

router.use('/auth', authRouter)
router.use('/user', userRouter)
router.use('/gameplay', gameplayRouter)

module.exports = router