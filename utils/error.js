import { validationResult } from "express-validator"

export const errorHandler = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty())
    return res.status(400).json({ 
      message: errors.errors[0].msg
    })

  next()
}