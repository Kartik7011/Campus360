import type { SkillEvidence } from './types'

// Runs a small sentence-embedding model in the browser. It downloads once (about 23 MB) on first use and
// is cached by the browser afterwards; resume text never leaves the device.
const MODEL = 'Xenova/all-MiniLM-L6-v2'

type Embed = (texts: string[]) => Promise<number[][]>
let embedder: Promise<Embed> | null = null

function loadEmbedder(): Promise<Embed> {
  embedder ??= import('@huggingface/transformers')
    .then(({ pipeline }) => pipeline('feature-extraction', MODEL, { dtype: 'q8' }))
    .then(
      (extract) => async (texts: string[]) =>
        (await extract(texts, { pooling: 'mean', normalize: true })).tolist() as number[][],
    )
    .catch((error) => {
      embedder = null // allow a retry, e.g. after the connection comes back
      throw error
    })
  return embedder
}

// Short phrases from the resume: each line, the pieces of list-like lines, and 1–2 word spans,
// so "ReactJS" is found inside "Built dashboards with ReactJS". Whole sentences match skills poorly.
export function resumePhrases(resumeText: string): string[] {
  const phrases = new Set<string>()
  for (const line of resumeText.split(/\n/)) {
    for (const piece of line.split(/[,;|•·:()]|\s[-–]\s/)) {
      const text = piece.trim().replace(/[.]+$/, '')
      if (text.length < 2) continue
      if (text.length <= 60) phrases.add(text)
      const words = text.split(/\s+/)
      if (words.length > 2)
        words.forEach((word, index) => {
          phrases.add(word)
          if (words[index + 1]) phrases.add(`${word} ${words[index + 1]}`)
        })
    }
  }
  return [...phrases].filter((phrase) => phrase.length >= 2)
}

// For each skill, the resume phrase closest in meaning and its cosine similarity.
export async function findSkillEvidence(
  resumeText: string,
  skills: string[],
  embed: Embed | Promise<Embed> = loadEmbedder(),
): Promise<Record<string, SkillEvidence>> {
  const phrases = resumePhrases(resumeText)
  if (phrases.length === 0 || skills.length === 0) return {}
  const vectors = await (await embed)([...skills, ...phrases])
  const evidence: Record<string, SkillEvidence> = {}
  skills.forEach((skill, index) => {
    let best: SkillEvidence = { line: '', similarity: 0 }
    phrases.forEach((phrase, phraseIndex) => {
      const similarity = dot(vectors[index], vectors[skills.length + phraseIndex])
      if (similarity > best.similarity) best = { line: phrase, similarity }
    })
    evidence[skill] = best
  })
  return evidence
}

// vectors are normalised, so the dot product is the cosine similarity
function dot(a: number[], b: number[]) {
  return a.reduce((total, value, index) => total + value * b[index], 0)
}
