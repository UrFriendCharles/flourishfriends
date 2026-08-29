import type { ClubQuestion } from "../logic/clubProtocol";

// The 0.5% Club question bank. Logic, observation, patterns, wordplay and
// visual reasoning — deliberately *not* trivia: nothing here needs outside
// knowledge, only thinking.
//
// Every record carries its explanation (§18 — the explanation is the payoff)
// and a source classification (§28). Visuals reference components in
// data/clubVisuals.tsx by assetId so nothing depends on an outside image.
//
// V1 ships four questions per tier; §50 targets 10 per tier for a private
// beta and 50 for launch. Append here — nothing else needs to change.

export const CLUB_QUESTIONS: ClubQuestion[] = [
  // ============================== 90% ==============================
  {
    id: "c90_seq_evens",
    difficulty: 90,
    questionType: "multiple_choice",
    prompt: "What number comes next?\n\n2, 4, 6, 8, ?",
    choices: ["9", "10", "12", "16"],
    correctAnswer: "10",
    explanation: "Each number goes up by 2, so after 8 comes 10.",
    category: "number patterns",
    mechanic: "arithmetic sequence",
    sourceType: "original",
  },
  {
    id: "c90_syllogism",
    difficulty: 90,
    questionType: "true_false",
    prompt:
      "All Bloops are Razzies.\nAll Razzies are Lazzies.\n\nTrue or false: all Bloops are Lazzies.",
    correctAnswer: "true",
    explanation:
      "Every Bloop is a Razzie, and every Razzie is a Lazzie — so every Bloop has to be a Lazzie too. The made-up words don't matter; the logic does.",
    category: "logic",
    mechanic: "transitive syllogism",
    sourceType: "original",
  },
  {
    id: "c90_odd_food",
    difficulty: 90,
    questionType: "multiple_choice",
    prompt: "Which one doesn't belong?",
    choices: ["Apple", "Banana", "Carrot", "Orange"],
    correctAnswer: "Carrot",
    explanation: "Apple, banana and orange are fruit. A carrot is a vegetable.",
    category: "odd one out",
    mechanic: "category exclusion",
    sourceType: "original",
  },
  {
    id: "c90_count_circles",
    difficulty: 90,
    questionType: "number",
    prompt: "How many circles are on the screen?",
    correctAnswer: "7",
    explanation: "There are 7 circles — count them in rows: 3 across the top, 2 in the middle, 2 at the bottom.",
    visual: { type: "svg", assetId: "dots_seven", altText: "Seven blue circles scattered across the screen" },
    category: "counting",
    mechanic: "direct count",
    sourceType: "original",
  },

  // ============================== 80% ==============================
  {
    id: "c80_short",
    difficulty: 80,
    questionType: "text",
    prompt: "What five-letter word becomes shorter when you add two letters to it?",
    correctAnswer: "short",
    acceptedAnswers: ["shorter"],
    explanation: 'Add "er" to SHORT and you get SHORTER — the word literally becomes "shorter".',
    category: "wordplay",
    mechanic: "self-referential word",
    sourceType: "adapted",
    sourceReference: "classic riddle",
  },
  {
    id: "c80_sheep",
    difficulty: 80,
    questionType: "number",
    prompt: "A farmer has 17 sheep. All but 9 run away. How many sheep does the farmer have left?",
    correctAnswer: "9",
    explanation: '"All but 9 run away" means 9 stayed. The 17 is there to make you subtract.',
    category: "lateral thinking",
    mechanic: "misleading arithmetic",
    sourceType: "adapted",
    sourceReference: "classic riddle",
  },
  {
    id: "c80_letters_ace",
    difficulty: 80,
    questionType: "multiple_choice",
    prompt: "Which letter comes next?\n\nA, C, E, G, ?",
    choices: ["H", "I", "J", "K"],
    correctAnswer: "I",
    explanation: "The sequence skips a letter each time: A (b) C (d) E (f) G (h) I.",
    category: "letter manipulation",
    mechanic: "alphabet step",
    sourceType: "original",
  },
  {
    id: "c80_arrow_seq",
    difficulty: 80,
    questionType: "visual_multiple_choice",
    prompt: "The arrow turns the same way each step. Which option comes next?",
    choices: ["A", "B", "C", "D"],
    correctAnswer: "C",
    explanation:
      "The arrow turns a quarter-turn clockwise each time: up → right → down → left. C is the arrow pointing left.",
    visual: {
      type: "svg",
      assetId: "seq_rotating_arrow",
      altText:
        "Three boxed arrows pointing up, right and down, then a question mark, with four lettered options: A up, B right, C left, D down",
    },
    category: "spatial reasoning",
    mechanic: "rotation sequence",
    sourceType: "original",
  },

  // ============================== 70% ==============================
  {
    id: "c70_five_daughters",
    difficulty: 70,
    questionType: "multiple_choice",
    prompt:
      "Mary's father has five daughters: Nana, Nene, Nini, Nono and… what is the fifth daughter's name?",
    choices: ["Nunu", "Mary", "Nana", "Nobody"],
    correctAnswer: "Mary",
    explanation:
      "The pattern pulls you toward Nunu, but the first four words of the question already told you: they are Mary's father's daughters, so the fifth is Mary.",
    category: "lateral thinking",
    mechanic: "pattern misdirection",
    sourceType: "adapted",
    sourceReference: "classic riddle",
  },
  {
    id: "c70_eggs",
    difficulty: 70,
    questionType: "number",
    prompt:
      "It takes 5 minutes to boil one egg. How many minutes does it take to boil 5 eggs in the same pot of water?",
    correctAnswer: "5",
    explanation: "The eggs boil at the same time, not one after another — so it's still 5 minutes.",
    category: "logic",
    mechanic: "parallel vs sequential",
    sourceType: "adapted",
    sourceReference: "classic riddle",
  },
  {
    id: "c70_squares_2x2",
    difficulty: 70,
    questionType: "number",
    prompt: "How many squares of any size can you find in this figure?",
    correctAnswer: "5",
    explanation: "Four small squares, plus the big square around them all — 5 in total.",
    visual: {
      type: "svg",
      assetId: "grid_squares_2x2",
      altText: "A large square divided into a two-by-two grid of four smaller squares",
    },
    category: "counting",
    mechanic: "nested shape count",
    sourceType: "original",
  },
  {
    id: "c70_listen",
    difficulty: 70,
    questionType: "text",
    prompt: "Rearrange all six letters of LISTEN to spell a word meaning “completely quiet”.",
    correctAnswer: "silent",
    explanation: "LISTEN and SILENT use exactly the same six letters — a perfect anagram.",
    category: "wordplay",
    mechanic: "anagram",
    sourceType: "adapted",
    sourceReference: "classic anagram",
  },

  // ============================== 60% ==============================
  {
    id: "c60_fib",
    difficulty: 60,
    questionType: "multiple_choice",
    prompt: "What comes next?\n\n1, 1, 2, 3, 5, 8, ?",
    choices: ["10", "11", "13", "16"],
    correctAnswer: "13",
    explanation: "Each number is the sum of the two before it: 5 + 8 = 13.",
    category: "number patterns",
    mechanic: "recursive sequence",
    sourceType: "adapted",
    sourceReference: "Fibonacci sequence",
  },
  {
    id: "c60_rotation",
    difficulty: 60,
    questionType: "image_choice",
    prompt:
      "Three of these shapes are the same shape turned around. One has been flipped over. Which is the flipped one?",
    choices: ["A", "B", "C", "D"],
    choiceVisuals: [
      { type: "svg", assetId: "shape_l_rot0", altText: "L-shape with its foot pointing right" },
      { type: "svg", assetId: "shape_l_rot90", altText: "The same L-shape turned a quarter-turn" },
      { type: "svg", assetId: "shape_l_mirror", altText: "A mirrored L-shape with its foot pointing left" },
      { type: "svg", assetId: "shape_l_rot270", altText: "The same L-shape turned three quarter-turns" },
    ],
    correctAnswer: "C",
    explanation:
      "A, B and D are the same L turned by quarter-turns — the long arm always runs clockwise into the short one. C is a mirror image: no amount of turning gets you there without lifting it off the page.",
    category: "spatial reasoning",
    mechanic: "rotation vs reflection",
    sourceType: "original",
  },
  {
    id: "c60_second_place",
    difficulty: 60,
    questionType: "multiple_choice",
    prompt: "You're running a race and you overtake the runner in second place. What position are you in now?",
    choices: ["First", "Second", "Third", "Last"],
    correctAnswer: "Second",
    explanation:
      "You took second place from the person who had it — you didn't pass the leader, so you're second, not first.",
    category: "logic",
    mechanic: "position reasoning",
    sourceType: "adapted",
    sourceReference: "classic riddle",
  },
  {
    id: "c60_sevens",
    difficulty: 60,
    questionType: "number",
    prompt: "If you write out every whole number from 1 to 50, how many times do you write the digit 7?",
    correctAnswer: "5",
    explanation: "7, 17, 27, 37 and 47 — five sevens. The seventies (70–79) never arrive, because we stop at 50.",
    category: "counting",
    mechanic: "digit frequency",
    sourceType: "original",
  },

  // ============================== 50% ==============================
  {
    id: "c50_oblong",
    difficulty: 50,
    questionType: "number",
    prompt: "What number comes next?\n\n2, 6, 12, 20, 30, ?",
    correctAnswer: "42",
    explanation:
      "The gaps grow by 2 each time: +4, +6, +8, +10, then +12. 30 + 12 = 42. (They're also 1×2, 2×3, 3×4, 4×5, 5×6, 6×7.)",
    category: "number patterns",
    mechanic: "second difference",
    sourceType: "original",
  },
  {
    id: "c50_triangles",
    difficulty: 50,
    questionType: "number",
    prompt: "How many triangles of any size can you find in this figure?",
    correctAnswer: "6",
    explanation:
      "Three small triangles, two made of a neighbouring pair, and the whole big one — 6. (Every pair of the four lines from the top point makes exactly one triangle: 4 lines pair up 6 ways.)",
    visual: {
      type: "svg",
      assetId: "triangle_cevians_2",
      altText: "A large triangle with two lines drawn from the top point down to the base, splitting it into three parts",
    },
    category: "counting",
    mechanic: "overlapping shape count",
    sourceType: "original",
  },
  {
    id: "c50_seven",
    difficulty: 50,
    questionType: "text",
    prompt: "I am an odd number. Take away one letter and I become even. What number am I?",
    correctAnswer: "seven",
    acceptedAnswers: ["7"],
    explanation: "SEVEN. Take away the S and you're left with EVEN.",
    category: "wordplay",
    mechanic: "letter removal",
    sourceType: "adapted",
    sourceReference: "classic riddle",
  },
  {
    id: "c50_monopoly",
    difficulty: 50,
    questionType: "multiple_choice",
    prompt:
      "A man pushes his car until he reaches a hotel. The moment he arrives, he knows he's bankrupt. What's going on?",
    choices: [
      "He's playing Monopoly",
      "His car ran out of fuel",
      "The hotel charged him for parking",
      "He was pushing it to a scrapyard",
    ],
    correctAnswer: "He's playing Monopoly",
    explanation:
      "He's moving his little metal car around a board. Landing on a property with a hotel is what wipes him out.",
    category: "lateral thinking",
    mechanic: "reframing the scene",
    sourceType: "adapted",
    sourceReference: "classic lateral-thinking puzzle",
  },

  // ============================== 40% ==============================
  {
    id: "c40_clock_angle",
    difficulty: 40,
    questionType: "number",
    prompt:
      "A clock reads 3:15. How many degrees is the angle between the hour hand and the minute hand?",
    correctAnswer: "7.5",
    acceptedAnswers: ["7.5"],
    explanation:
      "At 3:15 the minute hand is exactly on 3 (90°), but the hour hand has already crept a quarter of the way toward 4 — a quarter of 30° is 7.5°. So the gap is 7.5°, not 0.",
    category: "logic",
    mechanic: "clock geometry",
    sourceType: "adapted",
    sourceReference: "classic puzzle",
  },
  {
    id: "c40_matrix",
    difficulty: 40,
    questionType: "visual_multiple_choice",
    prompt: "Which shape belongs in the empty box?",
    choices: ["A", "B", "C", "D"],
    correctAnswer: "B",
    explanation:
      "Count the sides. Every step right adds a side, and so does every step down: the last row runs 5, 6, then 7. B is the seven-sided shape.",
    visual: {
      type: "svg",
      assetId: "matrix_polygon_sides",
      altText:
        "A three-by-three grid of polygons with three, four, five sides on the top row, four, five, six on the second, five, six and a question mark on the third, beside four lettered options with six, seven, eight and five sides",
    },
    category: "pattern recognition",
    mechanic: "matrix completion",
    sourceType: "original",
  },
  {
    id: "c40_ottffss",
    difficulty: 40,
    questionType: "text",
    prompt: "Which letter comes next?\n\nO, T, T, F, F, S, S, ?",
    correctAnswer: "E",
    acceptedAnswers: ["eight", "e"],
    explanation: "They're the first letters of One, Two, Three, Four, Five, Six, Seven — so next is E for Eight.",
    category: "hidden information",
    mechanic: "initial letters",
    sourceType: "adapted",
    sourceReference: "classic sequence puzzle",
  },
  {
    id: "c40_typists",
    difficulty: 40,
    questionType: "number",
    prompt: "If 2 typists can type 2 pages in 2 minutes, how many typists are needed to type 18 pages in 6 minutes?",
    correctAnswer: "6",
    explanation:
      "One typist types one page in 2 minutes, so in 6 minutes one typist manages 3 pages. 18 ÷ 3 = 6 typists. (The tempting answer, 18, forgets they get three times as long.)",
    category: "logic",
    mechanic: "rate reasoning",
    sourceType: "adapted",
    sourceReference: "classic rate puzzle",
  },

  // ============================== 30% ==============================
  {
    id: "c30_bat_ball",
    difficulty: 30,
    questionType: "number",
    prompt:
      "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How many cents does the ball cost?",
    correctAnswer: "5",
    explanation:
      "Not 10. If the ball were 10¢ the bat would be $1.10 and the total $1.20. The ball is 5¢ and the bat $1.05 — exactly a dollar more, $1.10 together.",
    category: "logic",
    mechanic: "intuition trap",
    sourceType: "adapted",
    sourceReference: "cognitive reflection test",
  },
  {
    id: "c30_squares_3x3",
    difficulty: 30,
    questionType: "number",
    prompt: "How many squares of any size can you find in this figure?",
    correctAnswer: "14",
    explanation: "Nine small squares, four made of a 2×2 block, and one big square around everything: 9 + 4 + 1 = 14.",
    visual: {
      type: "svg",
      assetId: "grid_squares_3x3",
      altText: "A large square divided into a three-by-three grid of nine smaller squares",
    },
    category: "counting",
    mechanic: "nested shape count",
    sourceType: "original",
  },
  {
    id: "c30_straight_letters",
    difficulty: 30,
    questionType: "text",
    prompt: "Which letter comes next?\n\nA, E, F, H, I, K, L, M, N, ?",
    correctAnswer: "T",
    explanation:
      "These are the capital letters you can draw with straight lines only, in alphabetical order: A E F H I K L M N. O, P, Q, R and S all need a curve — so the next one is T.",
    category: "observation",
    mechanic: "letter shape rule",
    sourceType: "adapted",
    sourceReference: "classic sequence puzzle",
  },
  {
    id: "c30_weighings",
    difficulty: 30,
    questionType: "number",
    prompt:
      "You have 8 identical-looking balls. One is slightly heavier. Using a balance scale, what is the fewest weighings that is guaranteed to find it?",
    correctAnswer: "2",
    explanation:
      "Weigh 3 against 3. If one side sinks, the heavy ball is in that three; if they balance, it's one of the two left out. Either way, one more weighing finds it — 2 in total.",
    category: "deduction",
    mechanic: "information splitting",
    sourceType: "adapted",
    sourceReference: "classic balance puzzle",
  },

  // ============================== 20% ==============================
  {
    id: "c20_lily",
    difficulty: 20,
    questionType: "number",
    prompt:
      "A patch of lily pads doubles in size every day. It covers the whole lake on day 48. On which day does it cover exactly half the lake?",
    correctAnswer: "47",
    explanation:
      "It doubles every day, so the day before it's full it must be half full — day 47. (Day 24 is the trap: that's a tiny sliver, not half.)",
    category: "logic",
    mechanic: "exponential intuition",
    sourceType: "adapted",
    sourceReference: "cognitive reflection test",
  },
  {
    id: "c20_fold",
    difficulty: 20,
    questionType: "visual_multiple_choice",
    prompt:
      "A square sheet is folded in half, then in half again. One hole is punched through all the layers. Which pattern shows the sheet unfolded?",
    choices: ["A", "B", "C", "D"],
    correctAnswer: "B",
    explanation:
      "Two folds means four layers, so one punch makes four holes — and unfolding mirrors them across both fold lines. B is the only option with four holes placed symmetrically in the four quarters.",
    visual: {
      type: "svg",
      assetId: "paper_fold_punch",
      altText:
        "A small folded square with one punched hole, then four lettered options showing an unfolded square with different hole patterns",
    },
    category: "spatial reasoning",
    mechanic: "paper folding",
    sourceType: "adapted",
    sourceReference: "classic spatial-reasoning format",
  },
  {
    id: "c20_word_rule",
    difficulty: 20,
    questionType: "multiple_choice",
    prompt: "What do these words have in common?\n\nBANANA · DRESSER · GRAMMAR · POTATO · REVIVE · UNEVEN",
    choices: [
      "Move the first letter to the end and the word reads the same backwards",
      "They all contain a double letter",
      "They all start and end with the same letter",
      "They all have exactly three vowels",
    ],
    correctAnswer: "Move the first letter to the end and the word reads the same backwards",
    explanation:
      "BANANA → ANANAB, and ANANAB read backwards is BANANA. The same trick works for all six: DRESSER → RESSERD, GRAMMAR → RAMMARG, POTATO → OTATOP, REVIVE → EVIVER, UNEVEN → NEVENU.",
    category: "wordplay",
    mechanic: "hidden shared rule",
    sourceType: "adapted",
    sourceReference: "classic word puzzle",
  },
  {
    id: "c20_ages",
    difficulty: 20,
    questionType: "number",
    prompt:
      "A father is exactly 4 times as old as his son. In 20 years, he will be exactly twice as old as his son. How old is the son now?",
    correctAnswer: "10",
    explanation:
      "If the son is 10 the father is 40. In 20 years they're 30 and 60 — exactly double. (Solve it as 4s + 20 = 2(s + 20).)",
    category: "logic",
    mechanic: "age algebra",
    sourceType: "original",
  },

  // ============================== 10% ==============================
  {
    id: "c10_portrait",
    difficulty: 10,
    questionType: "multiple_choice",
    prompt:
      "A man looks at a portrait and says:\n\n“Brothers and sisters I have none, but that man's father is my father's son.”\n\nWho is in the portrait?",
    choices: ["His son", "His father", "Himself", "His nephew"],
    correctAnswer: "His son",
    explanation:
      "He has no brothers, so “my father's son” is the speaker himself. That makes him the portrait man's father — so the portrait shows his son.",
    category: "deduction",
    mechanic: "relationship unwinding",
    sourceType: "adapted",
    sourceReference: "classic riddle",
  },
  {
    id: "c10_clock_overlap",
    difficulty: 10,
    questionType: "number",
    prompt: "In 24 hours, how many times do the hour hand and the minute hand of a clock overlap exactly?",
    correctAnswer: "22",
    explanation:
      "The hands meet 11 times in each 12-hour cycle, not 12 — between 11:00 and 12:00 they only meet at 12 o'clock itself. 11 × 2 = 22.",
    category: "logic",
    mechanic: "clock geometry",
    sourceType: "adapted",
    sourceReference: "classic puzzle",
  },
  {
    id: "c10_rect_3x3",
    difficulty: 10,
    questionType: "number",
    prompt: "How many rectangles of any size can you find in this figure? (Squares count as rectangles.)",
    correctAnswer: "36",
    explanation:
      "A rectangle is fixed by picking 2 of the 4 vertical lines and 2 of the 4 horizontal lines. That's 6 × 6 = 36.",
    visual: {
      type: "svg",
      assetId: "grid_rect_3x3",
      altText: "A large square divided into a three-by-three grid of nine smaller squares",
    },
    category: "counting",
    mechanic: "combinatorial count",
    sourceType: "original",
  },
  {
    id: "c10_look_say",
    difficulty: 10,
    questionType: "number",
    prompt: "What comes next?\n\n1, 11, 21, 1211, 111221, ?",
    correctAnswer: "312211",
    explanation:
      "Each line describes the one above it out loud. 111221 is “three 1s, two 2s, one 1” → 312211.",
    category: "pattern recognition",
    mechanic: "look-and-say",
    sourceType: "adapted",
    sourceReference: "look-and-say sequence",
  },

  // ============================== 5% ==============================
  {
    id: "c5_ropes",
    difficulty: 5,
    questionType: "multiple_choice",
    prompt:
      "You have two ropes. Each takes exactly 60 minutes to burn end to end, but neither burns at a steady rate. With only a lighter, how do you measure exactly 45 minutes?",
    choices: [
      "Light rope 1 at both ends and rope 2 at one end; when rope 1 burns out, light rope 2's other end",
      "Light both ropes at one end at the same time and stop when the first one finishes",
      "Cut rope 1 exactly in half, burn it, then burn three quarters of rope 2",
      "Light rope 1 at one end; when it burns out, light rope 2 at both ends",
    ],
    correctAnswer:
      "Light rope 1 at both ends and rope 2 at one end; when rope 1 burns out, light rope 2's other end",
    explanation:
      "Burning rope 1 from both ends uses it up in 30 minutes, however uneven it is. At that moment rope 2 has 30 minutes of rope left — lighting its other end halves that to 15. 30 + 15 = 45.",
    timerSeconds: 60,
    category: "lateral thinking",
    mechanic: "measuring without a clock",
    sourceType: "adapted",
    sourceReference: "classic burning-rope puzzle",
  },
  {
    id: "c5_knockout",
    difficulty: 5,
    questionType: "number",
    prompt:
      "137 players enter a knockout tournament. Losers are out immediately; byes are given where needed. How many matches are played in total to produce one champion?",
    correctAnswer: "136",
    explanation:
      "Every match eliminates exactly one player, and 136 players must be eliminated to leave one champion. So 136 matches — the bracket shape and byes never matter.",
    category: "deduction",
    mechanic: "invariant counting",
    sourceType: "adapted",
    sourceReference: "classic counting puzzle",
  },
  {
    id: "c5_tri_grid",
    difficulty: 5,
    questionType: "number",
    prompt: "How many triangles of any size can you find in this figure?",
    correctAnswer: "27",
    explanation:
      "Pointing up: 10 small, 6 of side 2, 3 of side 3, 1 of side 4 — that's 20. Pointing down: 6 small and 1 of side 2 — that's 7. Together, 27.",
    timerSeconds: 60,
    visual: {
      type: "svg",
      assetId: "triangle_grid_4",
      altText: "A large triangle divided into sixteen small triangles by lines parallel to each side",
    },
    category: "counting",
    mechanic: "triangular grid count",
    sourceType: "original",
  },
  {
    id: "c5_alphabetical_digits",
    difficulty: 5,
    questionType: "multiple_choice",
    prompt: "What is special about this number?\n\n8 5 4 9 1 7 6 3 2 0",
    choices: [
      "Its digits are in alphabetical order by their English names",
      "It uses each digit once and is divisible by 9",
      "No two neighbouring digits add up to 10",
      "Reading it backwards gives a prime number",
    ],
    correctAnswer: "Its digits are in alphabetical order by their English names",
    explanation:
      "Eight, five, four, nine, one, seven, six, three, two, zero — alphabetical order. It's the only way to list all ten digits like that.",
    timerSeconds: 45,
    category: "hidden information",
    mechanic: "spelling order",
    sourceType: "adapted",
    sourceReference: "classic number curiosity",
  },

  // ============================== 0.5% ==============================
  {
    id: "c05_cheryl",
    difficulty: 0.5,
    questionType: "multiple_choice",
    prompt:
      "Cheryl tells Albert her birth month and Bernard her birth day. It is one of:\n\nMay 15, May 16, May 19 · June 17, June 18 · July 14, July 16 · August 14, August 15, August 17\n\nAlbert: “I don't know when it is, and I know Bernard doesn't know either.”\nBernard: “At first I didn't know, but now I do.”\nAlbert: “Then I know it too.”\n\nWhen is Cheryl's birthday?",
    choices: ["July 16", "August 17", "May 16", "June 17"],
    correctAnswer: "July 16",
    explanation:
      "Albert is sure Bernard doesn't know, so the month can't contain a unique day — that rules out May (19) and June (18). Bernard now knows, so his day isn't 14 (it appears in both July and August). That leaves July 16, August 15 and August 17. Albert now knows too, so the month must have only one candidate left: July. July 16.",
    timerSeconds: 120,
    category: "deduction",
    mechanic: "common knowledge reasoning",
    sourceType: "adapted",
    sourceReference: "Cheryl's Birthday, 2015 Singapore SASMO olympiad problem",
  },
  {
    id: "c05_sylvester",
    difficulty: 0.5,
    questionType: "number",
    prompt: "What number comes next?\n\n1, 2, 6, 42, 1806, ?",
    correctAnswer: "3263442",
    explanation:
      "Each number is the one before it squared, plus itself: 1²+1 = 2, 2²+2 = 6, 6²+6 = 42, 42²+42 = 1806, and 1806² + 1806 = 3,263,442.",
    timerSeconds: 60,
    category: "number patterns",
    mechanic: "recursive squaring",
    sourceType: "adapted",
    sourceReference: "Sylvester's sequence",
  },
  {
    id: "c05_bookkeeper",
    difficulty: 0.5,
    questionType: "text",
    prompt: "Name an everyday English word that contains three double letters in a row.",
    correctAnswer: "bookkeeper",
    acceptedAnswers: ["bookkeeping", "book keeper"],
    explanation: "BOOKKEEPER — oo, kk, ee, back to back to back. (BOOKKEEPING works too.)",
    timerSeconds: 60,
    category: "wordplay",
    mechanic: "letter pattern search",
    sourceType: "adapted",
    sourceReference: "classic word puzzle",
  },
  {
    id: "c05_pirates",
    difficulty: 0.5,
    questionType: "number",
    prompt:
      "Five pirates, ranked strictly by seniority, split 100 gold coins. The most senior proposes a split; everyone votes. If at least half vote yes, it stands. Otherwise the proposer goes overboard and the next most senior proposes.\n\nEvery pirate is perfectly logical and wants, in order: to survive, to get the most gold, and to throw others overboard. How many coins does the most senior pirate keep?",
    correctAnswer: "98",
    explanation:
      "Work backwards. With 2 pirates left, the senior one keeps everything (his own vote is half). So with 3, the most junior would get nothing and will accept 1 coin from the pirate above him. Carrying that logic up, the top pirate only needs two extra votes — he buys them with 1 coin each and keeps 98.",
    timerSeconds: 120,
    category: "deduction",
    mechanic: "backward induction",
    sourceType: "adapted",
    sourceReference: "classic pirate game-theory puzzle",
  },
];

/** Ids grouped by tier — the selector picks one from each list. */
export const CLUB_QUESTIONS_BY_TIER = CLUB_QUESTIONS.reduce<Record<string, ClubQuestion[]>>(
  (acc, q) => {
    const key = String(q.difficulty);
    (acc[key] ??= []).push(q);
    return acc;
  },
  {}
);
