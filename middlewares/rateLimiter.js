import Redis from 'ioredis'

import { isValidFullAccessKey } from '../utils/access.js'

const redis = new Redis() // Подключение к Redis (по умолчанию localhost:6379)

const LIMIT = 10 // Максимум 10 запросов
const WINDOW = 30 * 60 // Время окна в секундах (30 минут)

const getClientIp = (req) => {
  // Для случаев, когда приложение работает за прокси или балансировщиком нагрузки
  const forwardedFor = req.headers['x-forwarded-for'];
  
  // Если заголовок x-forwarded-for есть, это значит, что перед нами прокси или балансировщик,
  // и в нем может быть несколько IP-адресов, разделенных запятой.
  // Первый адрес в списке - это реальный IP клиента.
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // Если заголовка нет, используем req.ip
  return req.ip;
};

export async function rateLimiter(req, res, next) {
  const {
    fullAccessKey = ''
  } = req.body

  // Проверка на ключ для полного доступа
  if (fullAccessKey) {
    if (isValidFullAccessKey(fullAccessKey) === false) {
      return res.status(400).json({ message: `Invalid full access key.`})
    } else {
      next()
      return
    }
  }

  const ip = getClientIp(req) // Получаем IP пользователя
  const key = `rate-limit:${ip}`

  // Узнаем, сколько запросов уже есть в Redis
  const requests = await redis.incr(key)

  if (requests === 1) {
    // Устанавливаем TTL на первый запрос (сбрасывается через 30 минут)
    await redis.expire(key, WINDOW)
  }

  if (requests > LIMIT) {
    // Узнаем, сколько времени осталось до сброса лимита
    const ttl = await redis.ttl(key)
    const unlockTime = new Date(Date.now() + ttl * 1000).toISOString()

    return res.status(429).json({
      message: `Too many requests. Try again in ${ttl} seconds.`,
      unlockAt: unlockTime
    })
  }

  next()
}
