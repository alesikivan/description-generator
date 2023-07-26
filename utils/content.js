export const getUnique = arr => {
  const unique = new Set([...arr])

  return [...unique]
}

export const replaceAll = (str, find, replace) =>{
  return str.replace(new RegExp(find, 'g'), replace)
}

export const getTextFromBrackets = (inputText) =>{
  const regex = /\[[^\]]+\]/

  const match = inputText.match(regex)
  return match ? match[0] : ''
}

export const getKeywordsFromBrackets = (bracketsText) =>{
  const keywords = bracketsText
    .replace('[', '')
    .replace(']', '')
    .split(',')
    .map(keyword => keyword.trim())

  return keywords
}
