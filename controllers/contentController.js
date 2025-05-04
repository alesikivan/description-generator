import dotenv from 'dotenv'
dotenv.config()
import puppeteer from "puppeteer"
import { Configuration, OpenAIApi } from "openai"

import { getKeywordsFromBrackets, getTextFromBrackets, getUnique, replaceAll } from '../utils/content.js'
import { randomTopic } from '../utils/random.js'
import { JavaScriptTopics } from '../modules/braavo/javascript.js'
import { PythonTopics } from '../modules/braavo/python.js'
import { sqlTopics } from '../modules/braavo/sql.js'
import { phpTopics } from '../modules/braavo/php.js'
import { nodeJsTopics } from '../modules/braavo/node.js'
import { htmlTopics } from '../modules/braavo/html.js'
import Question from '../db/mongo/models/Question.js'
import { BehaviorTopics, SystemDesignTopics, TeamworkTopics, TimeManagementTopics } from '../modules/braavo/soft.js'

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

        //
        // const cont = await page.content()
        // console.log(cont)
        //

        if (response.status() >= 400) {
          await browser.close()
          return res.status(400).json({ message: `Website returned HTTP status ${response.status()}` })
        }

        let content = await page.evaluate(() => {
          const tags = 'title, meta, h1, h2, h3, p, span, ul, ol, li, section, article'
          const importantElements = document.querySelectorAll(tags)

          return Array.from(importantElements).map(element => {
            const tagName = element.tagName.toLowerCase()
            const textContent = element.textContent.trim()

            if (tagName === 'meta' && element.name === 'description')
              return { tag: tagName, content: element.content, type: 'description' }

            return { tag: tagName, content: textContent }
          })
        })


        let metaDescriptionTag = content.find(tag => tag.type && tag.type === 'description')
        let metaDescription = metaDescriptionTag ? metaDescriptionTag.content : ''

        // Чистим от лишнего описания
        if (metaDescriptionTag)
          content = content.filter(tag => {
            if (tag.type && tag.type === 'description') {
              return false
            }

            return true
          })

        await browser.close()

        let titleTag = content.find(item => item.tag === 'title')

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

        const preparedDescriptionContent = metaDescription ? `The website description: ${metaDescription}` : ''

        const chatContent = `
          ${title}
          ${preparedDescriptionContent}
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
              Try to make the answer as short as possible, but express its essence to the maximum.
	            Do not start the response from text like "This website is about"..., just get straight to the point of the topic.
              You need write only the answer, for exmaple: Surgeons performed the operation using the latest advances in medical technology, which made it possible to minimize the patient’s recovery time. Thanks to their high qualifications and innovative treatment methods, the results of the operation exceeded all expectations. [Medicine, Surgical operation, Advances in Medicine, ...].
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
          model: "gpt-4o-mini",
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
        if (mode === 'TEST_MODE') clientResponse.abstract = chatContent

        return res.status(200).json(clientResponse)
      }
    } catch (err) {
      console.log(err)
      return res.status(400).json({ message: 'Failed to get web page description. Reload a page and try again.', })
    }
  }

  async cliporyAutoGenerate(req, res) {
    try {
      {
        const {
          link,
          mode = 'PROD_MODE',
          groups = []
        } = req.body

        const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox'],
        })
        const page = await browser.newPage()

        const response = await page.goto(link.trim(), { waitUntil: 'networkidle2' })

        //
        // const cont = await page.content()
        // console.log(cont)
        //

        if (response.status() >= 400) {
          await browser.close()
          return res.status(400).json({ message: `Website returned HTTP status ${response.status()}` })
        }

        let content = await page.evaluate(() => {
          const tags = 'title, meta, h1, h2, h3, p, span, ul, ol, li, section, article'
          const importantElements = document.querySelectorAll(tags)

          return Array.from(importantElements).map(element => {
            const tagName = element.tagName.toLowerCase()
            const textContent = element.textContent.trim()

            if (tagName === 'meta' && element.name === 'description')
              return { tag: tagName, content: element.content, type: 'description' }

            return { tag: tagName, content: textContent }
          })
        })


        let metaDescriptionTag = content.find(tag => tag.type && tag.type === 'description')
        let metaDescription = metaDescriptionTag ? metaDescriptionTag.content : ''

        // Чистим от лишнего описания
        if (metaDescriptionTag)
          content = content.filter(tag => {
            if (tag.type && tag.type === 'description') {
              return false
            }

            return true
          })

        await browser.close()

        let titleTag = content.find(item => item.tag === 'title')

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

        const preparedDescriptionContent = metaDescription ? `The website description: ${metaDescription}` : ''

        const chatContent = `
          ${title}
          ${preparedDescriptionContent}
          Groups: ${groups.join(', ')}.
          The content of webpage: ${abstract}.
        `
        const messages = [
          {
            role: 'system',
            content: `
              You are a system for recognizing the topic of web pages by webpage content.
              You will get some words from website and users created titles of group and you need to recognizing the main sence and return about 3 sentences what it about.
              Also select existing from the passed list or create one title of group which describing this site. Put it to "[]" brackets. For example [Medicine]. But if the text is not valid and you couldn't recognize it, then just return ['null'].
              When processing content, skip all service information, such as cookies and the like.
              If the information (words) is not enough, then try to improvise, write from yourself.
              Try to make the answer as short as possible, but express its essence to the maximum.
	            Do not start the response from text like "This website is about"..., just get straight to the point of the topic.
              You need write only the answer, for exmaple: Surgeons performed the operation using the latest advances in medical technology, which made it possible to minimize the patient’s recovery time. Thanks to their high qualifications and innovative treatment methods, the results of the operation exceeded all expectations. [Medicine].
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
          model: "gpt-4o-mini",
          messages
        })

        let [{ message: { content: description } }] = completion.data.choices

        // Получаем текст [...]
        const bracketsText = getTextFromBrackets(description)

        // Удаляем ключевые слова [...] в конце предложения
        description = description.replace(bracketsText, '').trim()

        // Получаем ключевые слова по [...]
        const keywords = getKeywordsFromBrackets(bracketsText)

        const clientResponse = {
          description: description.endsWith(' .') ? description.replace(' .', '') : description,
          groups: keywords
        }
        if (mode === 'TEST_MODE') clientResponse.abstract = chatContent

        return res.status(200).json(clientResponse)
      }
    } catch (err) {
      console.log(err)
      return res.status(400).json({ message: 'Failed to get web page description. Reload a page and try again.', })
    }
  }

  async getClustersDescription(req, res) {
    try {
      {
        // [ { id: 1, keywords: 'doctor, surgeon, hospital' }, ... ]
        const { clusters } = req.body

        const systemContent = `
          You are an AI that generates a topic name and short description based on given keywords.
          These keywords have been preprocessed; they are lemmatized and stop words have been removed.
          In addition, please check the keywords for potential spelling mistakes and correct them if necessary.
          Take all this into account when generating the output.
          Try to make topics as distinguishable as possible, so they won't be equal to each other.
          Show only anwer. Output such a string as json so that I can immediately put it in the JSON.parse method.
          For example. You will get arr array to input: [
            {
              id: 1,
              keywords: 'doctor, surgeon, hospital'
            },
            {
              id: 2,
              keywords: 'integral, integral, theorem'
            }
          ]
          To output: [
            {
              id: 1,
              topic: 'Medicine',
              description: 'This topic explores the advancements in surgical techniques and practices that have emerged over the years within hospital settings. It delves into the critical role of doctors, particularly surgeons, in pioneering and adopting innovative procedures to enhance patient outcomes.'
            },
            {
              id: 2,
              topic: 'Math Fundamental',
              description: 'The topic focuses on the fundamental theorem of calculus, an essential concept in mathematics that connects differentiation and integration. It explains how integrals play a crucial role in finding areas, computing accumulations, and solving various real-world problems.'
            },
          ]
        `

        const userContent = `
          Input: ${JSON.stringify(clusters, null, 2)}
        `

        const messages = [
          {
            role: 'system',
            content: systemContent
          },
          { role: "user", content: userContent }
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

        return res.status(200).json({ clusters: JSON.parse(description) })
      }
    } catch (err) {
      console.log(err)
      return res.status(400).json({ message: 'Failed to get web page description. Reload a page and try again.', })
    }
  }

  async questionsGenerator(req, res) {
    try {
      const { level, skill, questionType } = req.body

      let topic = ''
      switch (skill) {
        case 'JavaScript':
          topic = randomTopic(JavaScriptTopics)
          break;

        case 'Python':
          topic = randomTopic(PythonTopics)
          break;

        case 'SQL':
          topic = randomTopic(sqlTopics)
          break;

        case 'PHP':
          topic = randomTopic(phpTopics)
          break;

        case 'Node.js':
          topic = randomTopic(nodeJsTopics)
          break;

        case 'HTML':
          topic = randomTopic(htmlTopics)
          break;

        // Soft Skills
        case 'Time Management':
          topic = randomTopic(TimeManagementTopics)
          break;
        case 'Teamwork':
          topic = randomTopic(TeamworkTopics)
          break;
        case 'System Design':
          topic = randomTopic(SystemDesignTopics)
          break;
        case 'Behavior':
          topic = randomTopic(BehaviorTopics)
          break;

        default:
          topic = ''
      }

      let questionTypeDescription = ''
      switch (questionType) {
        case 'Find the Error':
          questionTypeDescription = 'The question should be based on finding the error.'
          break;

        case 'Continue the Code':
          questionTypeDescription = 'The question must have a gap (____) in the code. And accordingly, the missing fragment must be one of the answers.'
          break;
      }

      const isSoftSkill = ['Time Management', 'Teamwork', 'System Design', 'Behavior'].includes(skill);

      const systemContent = isSoftSkill
        ? `
    You are an experienced HR and tech leader.
    You are interviewing a ${level} candidate to assess their "${skill}" skill.
    Focus on behavioral or situational questions, possibly related to '${topic}'.
    Make the question realistic and relevant to day-to-day work scenarios.
    Do not include the correct answer first in answersOptions.
    Adjust complexity to the candidate's level. Intern = simple scenarios. Senior = complex team dynamics or leadership.
    `
        : `
    You are an IT expert.
    You are interviewing a ${level} candidate for a ${skill} developer position.
    ${questionTypeDescription}
    Try to come up with something new, not standard questions.
    ${topic ? `Ask a question about '${topic}.'` : ''}
    Do not put the correct answer first on the answer answersOptions!
    Please consider the level of the candidate. If it is a Intern, then the questions should not be difficult, but if it is an Senior, the question must be difficult and so on.
    `;

      const userContent = isSoftSkill
        ? `Generate a behavioral or situational multiple-choice question in JSON format with the following structure:
{
  "question": "The description of the soft skill scenario or question",
  "answersOptions": ["option1", "option2", "option3", "option4"],
  "trueAnswer": "correct option",
  "explanation": "why this is the right choice (use <b></b> to highlight key points)"
}
Return ONLY valid JSON. Do NOT include any explanations or extra text. The client will parse the result using JSON.parse().`
        : `Generate a real-life programming question (The answersOptions option should include pre-written answers) in JSON format with the following structure:
{
  "question": "The description of question",
  "code": "task code or example of task code (do not show here true answer)",
  "answersOptions": ["answer1", "answer2", ...],
  "trueAnswer": "answer1",
  "explanation": "some answer (use <b></b> to highlight key parts)"
}
Return ONLY valid JSON. Do NOT include any explanations or extra text. The client will parse the result using JSON.parse().`;


      const messages = [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent }
      ];

      const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const openai = new OpenAIApi(configuration);

      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.8, // Повышаем "творчество"
        top_p: 1
      });

      let content = completion.data.choices[0].message.content.trim();

      // Убираем возможные ```json или ``` вокруг
      if (content.startsWith("```")) {
        content = content.replace(/```(?:json)?/g, "").trim();
      }

      const parsed = JSON.parse(content);

      const question = new Question({ ...parsed, level, skill, questionType, topic })
      const savedQuestion = await question.save()

      if (savedQuestion) {
        parsed.id = savedQuestion._id
      }

      return res.status(200).json(parsed);
    } catch (err) {
      console.error("Question generation error:", err);
      return res.status(400).json({ message: 'Failed to generate question. Please try again.' });
    }
  }


  // Маршрут для предрендеринга
  // async render(req, res) {
  //   // const { url } = req.query

  //   const url = 'http://localhost:3000/news'

  //   if (!url) {
  //     return res.status(400).send('Please provide a URL parameter.')
  //   }

  //   try {
  //     const content = await renderPage(url)
  //     res.send(content)
  //   } catch (error) {
  //     console.error('Error rendering page:', error)
  //     res.status(500).send('Error rendering page.')
  //   }
  // }
}

// async function renderPage(url) {
//   const browser = await puppeteer.launch({
//     headless: 'new',
//     args: ['--no-sandbox'],
//   })
//   const page = await browser.newPage()

//   await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 local-mda-server')

//   await page.goto(url, { waitUntil: 'networkidle2' })

//   const content = await page.content()

//   return content
// }

export default new ContentController()