/** Seeded off-chain messages shown while the on-chain board is empty or loading. */

export interface MockMessage {
  id:      string;
  author:  string; // display name or truncated address
  text:    string;
  onChain: false;
}

export const MOCK_MESSAGES: MockMessage[] = [
  { id: "m1",  author: "Garrett the Gruff",   text: "Beware the eastern pass — goblins move at dusk. Took three arrows to warn ye.", onChain: false },
  { id: "m2",  author: "0x4f2a...91bc",        text: "Lost a fine hound near the mill. Answers to Biscuit. Reward: 5 gold.", onChain: false },
  { id: "m3",  author: "Innkeeper Marda",      text: "Rooms are full through Harvest Moon. Sleep in the stable for half price.", onChain: false },
  { id: "m4",  author: "Anonymous",            text: "The alchemist on Copper Lane owes me for a reagent. He knows what he did.", onChain: false },
  { id: "m5",  author: "Sylvara Moonwhisper",  text: "Seeking a cartographer. Old maps of the Hollow Hills — bring them here.", onChain: false },
  { id: "m6",  author: "0x9c11...f3a0",        text: "Good swords for hire. No questions about cargo. Find me at the south docks.", onChain: false },
  { id: "m7",  author: "Brother Aldric",       text: "Lost my rosary near the fountain. Blue beads, silver cross. Bless you if returned.", onChain: false },
  { id: "m8",  author: "Dunk the Drifter",     text: "Two weeks on the road and the best thing I found was this tavern. 10/10.", onChain: false },
  { id: "m9",  author: "Merith the Merchant",  text: "Spices from the East arriving next fortnight. Reserve your order now.", onChain: false },
  { id: "m10", author: "Torga Ironfoot",        text: "Armour needs mending? I sharpen axes, shoe horses, and fix plate. Fair rates.", onChain: false },
  { id: "m11", author: "0x7e30...2241",         text: "Anyone else notice the well water tastes odd this week? Not just me, right?", onChain: false },
  { id: "m12", author: "Lady Vessel",           text: "The duke's courier never arrived. If you see a blue tabard on the road, detain him.", onChain: false },
  { id: "m13", author: "Pell the Pickpocket",  text: "Former pickpocket seeking honest work. Strong references. Mostly honest references.", onChain: false },
  { id: "m14", author: "Anonymous",            text: "I know what's in the locked chest behind the bar. Meet me at midnight.", onChain: false },
  { id: "m15", author: "Gregor One-Eye",       text: "Dice tournament every Tenthday. Entry: 1 silver. Prize: whatever Gregor feels like.", onChain: false },
];

/** Return `n` messages sampled at random from the mock pool. */
export function sampleMockMessages(n: number): MockMessage[] {
  const pool = [...MOCK_MESSAGES];
  const out: MockMessage[] = [];
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(...pool.splice(i, 1));
  }
  return out;
}
