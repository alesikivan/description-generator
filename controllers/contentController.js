import dotenv from 'dotenv'
dotenv.config()
import puppeteer from "puppeteer"
import { Configuration, OpenAIApi } from "openai"

import { getKeywordsFromBrackets, getTextFromBrackets, getUnique, replaceAll } from '../utils/content.js'

class ContentController {
  async autoGenerate(req, res) {
    try {
      {
        const { link, mode = 'PROD_MODE' } = req.body

        const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox'],
        })
        const page = await browser.newPage()

        const response = await page.goto(link.trim(), { waitUntil: 'networkidle2' })

        if (response.status() >= 400) {
          await browser.close()
          return res.status(400).json({ message: `Website returned HTTP status ${response.status()}` })
        }

        const content = await page.evaluate(() => {
          const tags = 'title, meta, h1, h2, h3, p, span, ul, ol, li, section, article'
          const importantElements = document.querySelectorAll(tags)

          return Array.from(importantElements).map(element => {
            const tagName = element.tagName.toLowerCase()
            const textContent = element.textContent.trim()

            return { tag: tagName, content: textContent }
          })
        })

        await browser.close()

        let titleTag = content.find(item => item.tag === 'title')

        // let headerTag = content.find(item => item.tag === 'h1')

        let abstract = content
          .filter(item => item.content.trim())
          .map(item => {
            let replacement = replaceAll(item.content, /\n/g, '')
            replacement = replaceAll(replacement, /\s+/g, ' ')

            return replacement.toLowerCase()
          })

        abstract = getUnique(abstract)
          .join(' ')
          .slice(0, 4_000)

        const title = titleTag && titleTag.content.trim()
          ? `The title of webiste is "${titleTag.content.trim()}".`
          : ''

        // const header = headerTag && headerTag.content.trim()
        //   ? `The main header on webiste is "${headerTag.content.trim()}".`
        //   : ''

        const chatContent = `
          ${title}
          The content of webpage: ${abstract}.
        `

        const messages = [
          {
            role: 'system',
            content: `
              You are a system for recognizing the topic of web pages by webpage content.
              You will get some words from website and you need to recognizing the main sence and return about 3 sentences what it about.
              Also add at least 5 words describing this site to the end start with "[" and end with "]". For example [Medicine, Surgical operation, Advances in Medicine, ...]. 
              When processing content, skip all service information, such as cookies and the like.
              If the information (words) is not enough, then try to improvise, write from yourself.
              Start your request from the words like: "The webpage is about...".
              You need write only the answer, for exmaple: Story is about how surgeons performed the operation. [Medicine, Surgical operation, Advances in Medicine, ...].
            `
          },
          {
            role: "user", content: chatContent
          }
        ]

        const configuration = new Configuration({
          apiKey: process.env.OPENAI_API_KEY,
        })

        const openai = new OpenAIApi(configuration)

        const completion = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages
        })

        let [{ message: { content: description } }] = completion.data.choices

        // Получаем текст [...]
        const bracketsText = getTextFromBrackets(description)

        // Удаляем ключевые слова [...] в конце предложения
        description = description.replace(bracketsText, '').trim()

        // Получаем ключевые слова по [...]
        const keywords = getKeywordsFromBrackets(bracketsText)

        const clientResponse = { description: description, keywords }
        if (mode === 'TEST_MODE' ) clientResponse.abstract = chatContent      

        return res.status(200).json(clientResponse)
      }
    } catch (err) {
      console.log(err)
      return res.status(400).json({ message: 'Failed to get web page description. Reload a page and try again.', })
    }
  }
}

export default new ContentController()