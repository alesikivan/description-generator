import { Schema, model } from 'mongoose'

const Question = new Schema({
  question: { type: String, default: '' },
  code: { type: String, default: '' },
  answersOptions: { type: [String], default: [] },
  trueAnswer: { type: String, default: '' },
  explanation: { type: String, default: '' },
  level: { type: String, default: '' },
  skill: { type: String, default: '' },
  questionType: { type: String, default: '' },
  topic: { type: String, default: '' },
  dateCreate: { type: Date, default: Date.now },
  dateUpdate: { type: Date, default: Date.now },
})

export default model('Question', Question)