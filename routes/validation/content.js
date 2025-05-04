import { check } from "express-validator"
import { errorHandler } from "../../utils/error.js"

export const questionsGeneratorValidation = [
  check('level')
    .isIn(['Intern', 'Junior', 'Middle', 'Senior'])
    .withMessage('Invalid level value'),

  check('skill')
    .isIn(['JavaScript', 'Python', 'SQL', 'PHP', 'HTML', 'Node.js', 'Teamwork', 'Time Management', 'Behavior', 'System Design'])
    .withMessage('Invalid skill value'),

  check('questionType')
    .isIn(['Question - Answer', 'Code Output Prediction', 'Find the Error', 'Continue the Code', 'Explain the Code', 'Fill in the Blanks'])
    .withMessage('Invalid type of question'),

  (req, res, next) => errorHandler(req, res, next),
]