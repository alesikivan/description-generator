import dotenv from 'dotenv'
dotenv.config()
import puppeteer from "puppeteer"
import { Configuration, OpenAIApi } from "openai"

class ContentController {
  async autoGenerate(req, res) {
    try {
      {
        const { link } = req.body

        const browser = await puppeteer.launch({ headless: 'new' })
        const page = await browser.newPage()

        const response = await page.goto(link, { waitUntil: 'networkidle2' })

        if (response.status() >= 400) {
            await browser.close()
            return res.status(400).json({ message: `Website returned HTTP status ${response.status()}` })
        }

        const content = await page.evaluate(() => {
          const tags = 'meta, h1, h2, h3, h4, h5, p, span, ul, ol, li, section, article, blockquote'
          const importantElements = document.querySelectorAll(tags)
          return Array.from(importantElements).map(element => element.textContent.trim())
        })

        await browser.close()

        const abstract = content
          .filter(d => d.trim())
          .join(' ')
          .slice(0, 4_000)

        const messages = [
          { 
            role: 'system', 
            content: 'You are a system for recognizing the topic of web pages by webpage code.'
          }, 
          {
            role: "user", content: `
              Determine the meaning of this page by a piece of web page content.
              About 3 sentences.
              Also add at least two words with a hashtag describing this site. 
              When processing content, skip all service information, such as cookies and the like.
              You need write only the answer, for exmaple: An article from the medical field, it tells how surgeons performed the operation. #surgery #medicine.
              The content: ${abstract}
            `
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

        const [{ message: { content: description } }] = completion.data.choices

        return res.status(200).json({ description: description, abstract })
      }
    } catch (err) {
      console.log(err)
      return res.status(400).json({ message: 'Failed to get web page description. Reload a page and try again.' ,  })
    }
  }
}

export default new ContentController()