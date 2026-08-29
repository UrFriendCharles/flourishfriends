# Question Worker Prompt — 0.5% Club

Drop-in replacement for §36 of the Question Factory specification.

Give the text below to each question worker (Gemini, ChatGPT, Grok, Claude…),
together with the Question Factory schema from §10 and the current bank digest:

```bash
node scripts/importQuestions.mjs --digest
```

Paste that digest into the "What we already have" section before sending.

When batches come back:

```bash
node scripts/importQuestions.mjs batch.jsonl --write src/data/incoming.ts
```

---

## The prompt

You are writing questions for **0.5% Club**, a party game played in a living
room: the questions are on a TV and everyone answers on their own phone,
against a 30-second clock, with the room watching.

Produce **40 complete questions** in one run. Forty verified questions is the
assignment; a hundred unverified ones is a failed assignment, because every
question you send is read by a person before it can be used. If you cannot
make a strong question at some difficulty, send fewer. **A short batch is a
success.** Never pad a tier to hit a number.

### What this game is

It rewards *looking at the question a second time*, not knowing things and not
calculating things. The best question in the bank is one where the answer was
sitting in the prompt the whole time and the player walks straight past it.
When someone hears the solution they should say "ohhh" — never "how was I
supposed to know that?"

Favour: logic, observation, pattern recognition, wordplay, spatial reasoning,
deduction, sequencing, lateral thinking, hidden rules, counting.

### Disqualifying rules

A question is wrong for this game — regardless of how good it is — if:

1. **It needs arithmetic.** No multi-digit multiplication, no long division, no
   more than two steps of mental arithmetic. The timer is thinking time, not
   calculating time. If a player would reach for a calculator, cut it. *(We
   shipped "1, 2, 6, 42, 1806, ?" whose answer is 3,263,442. Nobody in a living
   room is squaring 1806. Do not send us another one.)*
2. **It needs outside knowledge** — dates, celebrities, sport, history,
   geography, specialist vocabulary. Everyday knowledge is fine when it's the
   setting rather than the answer.
3. **More than one option is defensible.** See the self-check below.
4. **It cannot be explained in two sentences** after the reveal.

### Answer type mix

Across your 40 questions:

- **at least 16 multiple choice** (this is the most fun type on a phone — the
  options are part of the puzzle, and a player can work backwards from them)
- **no more than 10 number entry**
- **at least 10 visual** (see below)
- **at least 2 true/false** and **at least 2 image_choice**

A batch that is mostly text and number entry means a game that is mostly
staring at a keypad.

### Visual questions

We render our own artwork as SVG components — never source screenshots. There
are two ways to give us a visual question, and the first is far more useful:

**Reuse a component we already have.** These exist today and can be referenced
immediately by `assetId`, with your question shipping the day it arrives:

| assetId | what it draws |
|---|---|
| `dots_seven` | seven scattered circles |
| `seq_rotating_arrow` | arrow rotating through a sequence, options A–D |
| `grid_squares_2x2`, `grid_squares_3x3`, `grid_rect_3x3` | square grids |
| `triangle_cevians_2`, `triangle_grid_4` | subdivided triangles |
| `matrix_polygon_sides` | 3×3 matrix of polygons, options A–D |
| `paper_fold_punch` | fold-and-punch, options A–D |
| `seq_polygon_sides` | polygons gaining a side |
| `tile_dot_rotation` | a dot walking round a tile |
| `balance_two_scales` | two balance scales with shapes |
| `mirror_clock` | a clock face seen in a mirror |
| `notched_square` + `piece_l` / `piece_square` / `piece_bar` / `piece_t` | a square with a bite out of it, and candidate pieces |
| `odd_polygon_out` | four shapes, options A–D |
| `shape_l_rot0` / `rot90` / `rot270` / `mirror` | an L-shape rotated and mirrored |

**Or describe new artwork** in `visualSpec`, precisely enough that someone can
draw it without seeing your source: what appears, where, how many, what is
labelled. These questions wait until an artist gets to them, so only ask for
new art when the puzzle genuinely needs it.

For `visual_multiple_choice` the option letters are printed *on the artwork*,
so `correctAnswer` is the letter. For `image_choice` each option is its own
small picture the player taps.

### The difficulty ladder

Difficulty is how hard the *reasoning* is for a normal adult under time
pressure — not how obscure the subject is. Two hard rules:

- **A puzzle most people have heard before cannot go below 40%**, however
  clever it is. In a room of ten, someone always knows it.
- **The same puzzle is one full tier easier as multiple choice** than as open
  entry. Tier it as you're actually presenting it.

Anchor each tier against these real examples from the live bank:

| Tier | What it feels like | Anchor |
|---|---|---|
| 90% | The only challenge is paying attention | "A square has 4 corners and a triangle has 3. How many corners between them?" |
| 80% | One small twist | "A rooster lays an egg on a barn roof. Which side does it roll down?" (roosters don't lay eggs) |
| 70% | One real reasoning step | "Mary's father has five daughters: Nana, Nene, Nini, Nono and…?" |
| 60% | Find the rule, then use it | Three boxes labelled APPLES / ORANGES / MIXED, every label wrong — which do you draw from? |
| 50% | Two steps, no instant answer | Balance scales: two circles = a square, a square + a circle = a triangle. How many circles is a triangle? |
| 40% | Focused effort, unusual relationship | "Rearrange the letters of NEW DOOR to make one word." (ONE WORD) |
| 30% | Fair but genuinely hard to notice | "All tulips are flowers." Which of these must also be true? |
| 20% | A hidden rule you must discover | Four box labels, exactly one of which is true — where is the prize? |
| 10% | Very few get it; everyone understands the explanation | The four-card selection task: which two must you turn over to test "vowel implies even"? |
| 5% | Insight plus several steps | Two ropes, each burning 60 minutes unevenly — measure exactly 45 minutes. |
| 0.5% | The best puzzle you have | Cheryl's Birthday. |

**We are short at the top.** The bank currently holds only 4 questions at 0.5%,
5 at 5% and 7 at 10%. Questions there are worth several easy ones. A strong
hard question is multi-step deduction, or a rule you must work out *and then
apply* — not a single "aha" that people either get instantly or never.

### Be honest about where it came from

`sourceType` must be one of `source`, `adapted`, `original`, and there is a
test: **if the puzzle appears on any riddle site, in any quiz book, or in any
previous 1% Club episode, it is `adapted`** — even if you rewrote every word
and changed every number. `original` means you invented the mechanic. When
unsure, mark it `adapted` and give the reference.

This is not bookkeeping. Whether a puzzle is already famous is the single best
predictor of whether its difficulty label will survive contact with players. A
batch that claims 100% original tells us nothing and we have to check by hand.

### Self-check that can actually fail

Before returning each question:

- **Name the runner-up.** For every multiple-choice question, write down the
  strongest wrong option and one sentence on why it fails. Put it in
  `qa.notes`. Do not skip this — it is the check that works. Real examples we
  caught late: "Which word reads the same upside down?" offered both SWIMS and
  NOON (both do). "Which word is spelled incorrectly in the dictionary?"
  offered *incorrectly* and *wrongly* (same joke, both true). "Which word has
  two identical letters together?" offered BALLOON and BALLET.
- **Solve it yourself, from the prompt alone**, and confirm your answer matches
  what you wrote. One batch contained a five-digit divisibility puzzle where
  *none* of the four options satisfied the constraints.
- **Read the sequence from the first term.** A look-and-say puzzle arrived
  seeded "10, 11, 21…", which doesn't work — it has to start at 1.
- **State any assumption the player can't see.** "The next palindrome after
  12:21" is 70 minutes away on a 24-hour clock and 40 on a 12-hour one. Say
  which.

If you are not confident a question has exactly one defensible answer, **leave
it out**. We would rather have 31 questions than 40 with three landmines.

### What we already have

Do not send us these puzzles again — the same broad *mechanic* on a genuinely
different puzzle is welcome, but the same puzzle is not:

> *(paste the output of `node scripts/importQuestions.mjs --digest` here)*

Across four workers we have received four separate copies of LISTEN/SILENT,
three of the doubling lily pad, and three of "you take some apples." Check this
list before you write.

### Output

Return **JSONL**, one complete question object per line, in the Question
Factory schema (§10) with `status: "draft"`. Never end on a truncated object —
if you are running out of room, stop at the last complete question.

Then a short summary: total produced, count by difficulty, count by
`sourceType`, count by `questionType`, how many need new artwork versus reusing
an existing `assetId`, and any source pages you could not reach.

Start now and work through it independently.
