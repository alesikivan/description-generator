export const isValidFullAccessKey = (key) => {
  const keys = process.env.OPENAI_API_KEY 
    ? process.env.FULL_ACCESS_KEYS.split(',').map(key => key.trim()) 
    : []

  return Boolean(keys.some(token => token === key))
}