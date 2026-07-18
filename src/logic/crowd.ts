import type { Difficulty } from "../types";

const CROWD_RELIABILITY: Record<Difficulty, number> = {
  easy: 0.9,
  medium: 0.75,
  hard: 0.6,
};

/**
 * Simulate an Ask the Crowd vote. The correct answer receives the top share
 * with probability equal to the difficulty's reliability; otherwise a random
 * wrong answer wins the vote.
 */
export function simulateCrowdVote(
  choices: string[],
  correctAnswer: string,
  difficulty: Difficulty
): Record<string, number> {
  const crowdIsRight = Math.random() < CROWD_RELIABILITY[difficulty];
  const wrongChoices = choices.filter((c) => c !== correctAnswer);
  const favorite = crowdIsRight
    ? correctAnswer
    : wrongChoices[Math.floor(Math.random() * wrongChoices.length)];

  // Favorite gets 40-65%, the rest split the remainder unevenly
  const favoriteShare = 40 + Math.floor(Math.random() * 26);
  let remaining = 100 - favoriteShare;
  const others = choices.filter((c) => c !== favorite);
  const votes: Record<string, number> = { [favorite]: favoriteShare };
  others.forEach((choice, i) => {
    if (i === others.length - 1) {
      votes[choice] = remaining;
    } else {
      const maxShare = Math.max(0, remaining - (others.length - 1 - i));
      const share = Math.floor(Math.random() * (maxShare + 1));
      votes[choice] = share;
      remaining -= share;
    }
  });
  return votes;
}
