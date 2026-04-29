// Daily spark question bank.
// We keep this deterministic (no DB) so both parties get the same question on a given day.

export const sparkQuestions: string[] = [
  // Revealing without being heavy
  "What's something you were completely wrong about a few years ago?",
  "What's a hill you'll die on that most people would find ridiculous?",
  "What's the most spontaneous thing you've done in the last year?",
  "What's something you do differently from how most people do it?",
  "What's a skill you have that would genuinely surprise people?",
  "What's the last thing you got unreasonably excited about?",
  "What's something you've changed your mind about recently?",
  "What do you think you're better at than you actually are?",
  "What's a completely irrational thing you believe or do?",
  "What's something you used to be embarrassed about but aren't anymore?",

  // How they spend time
  "What does a perfect Sunday look like for you — be specific?",
  "What's a place in your city you'd take someone who's never been there?",
  "What are you in the middle of right now — book, show, project, phase of life?",
  "What's something you've been meaning to do for months but haven't?",
  "What's the last thing you did for the first time?",
  "How do you actually feel about mornings?",
  "What would you do with a completely free Tuesday — no obligations?",
  "What's a hobby or interest you've picked up and then abandoned?",
  "What's something you do alone that you actually love?",
  "What's your relationship with cooking?",

  // Character and humor
  "What's the most creative excuse you've ever used?",
  "What's a totally unhinged opinion you have about food?",
  "If your friends described you in three words, what would they say — and would you agree?",
  "What's something you find genuinely funny that you can never fully explain?",
  "What's a movie, show, or book you'll defend forever even though people hate it?",
  "What's the worst advice you've ever actually followed?",
  "What's a compliment you've received that you still think about?",
  "What's something you do that makes you feel like a kid again?",
  "What would your enemies say about you?",
  "What's a weird thing that makes you immediately like someone?",

  // Light ambition and curiosity
  "What's something you're quietly working on that no one really knows about?",
  "What's a skill you genuinely wish you had?",
  "What's the last thing you fell down a rabbit hole researching?",
  "What's something you want to get really good at in the next few years?",
  "What's the most interesting thing you've learned this month?",
  "If you could spend a year getting good at one thing with no obligations, what would it be?",
  "What's a place you want to go and what specifically do you want to do there?",
  "What's something you've built, made, or created that you're proud of?",
  "What do you think about on long drives or walks?",
  "What's a question you think about more than most people probably do?",

  // Social and relational
  "What's something that takes most people a while to figure out about you?",
  "What kind of energy do you bring to a group?",
  "How do you actually feel about big social events?",
  "What's the dynamic with your closest friend — how did you meet, what do you do?",
  "What's something a friend did recently that made you appreciate them?",
  "Are you someone people call when something goes wrong or when something goes right?",
  "What do you need to recharge after a social week?",
  "What's something you're weirdly loyal to — brand, team, place, anything?",
  "How do you feel about being early vs on time vs fashionably late?",
  "What's something small you do that you think says a lot about who you are?",
]

const epochMs = new Date("2024-01-01").getTime()

export function getTodaysQuestionIndex(): number {
  const now = Date.now()
  const dayIndex = Math.floor((now - epochMs) / (1000 * 60 * 60 * 24))
  return dayIndex % sparkQuestions.length
}

export function getTodaysQuestion(): string {
  return sparkQuestions[getTodaysQuestionIndex()]
}

