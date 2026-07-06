export interface SignatureTechnique {
  name: string;
  threat: number;
}

export interface KungfuFaction {
  id: string;
  name: string;
  faction: string;
  origin: string;
  philosophy: string;
  signatureTechniques: SignatureTechnique[];
  famousPractitioners: string[];
  funFact: string;
  catchphrase: string;
}

// A faction is only as scary as its scariest move.
export function factionThreat(f: KungfuFaction): number {
  return Math.max(...f.signatureTechniques.map((t) => t.threat));
}

export const KUNGFU_FACTIONS: KungfuFaction[] = [
  {
    id: "shaolin",
    name: "Shaolin",
    faction: "Orthodox Buddhist",
    origin: "Mount Song, Henan (c. 5th century CE). A monk from the West arrived, saw the monks were in terrible shape, and invented martial arts because the Wi-Fi was out.",
    philosophy:
      "Zen and fists are one. Achieve enlightenment through punching and being punched. The body is a temple; the temple can also throw hands.",
    signatureTechniques: [
      { name: "Arhat Fist", threat: 8 },
      { name: "Sweeping Leg of Regret", threat: 6 },
      { name: "Iron Headbutt of Piety", threat: 9 },
    ],
    famousPractitioners: [
      "Bodhidharma (allegedly, he denies it)",
      "Abbot Fangzhang (very busy)",
      "The 18 Arhats",
    ],
    funFact:
      "Shaolin monks have been accused of inventing kungfu, Zen Buddhism, and the concept of a good cardio day, all in the same afternoon.",
    catchphrase: "The fist that prays also slays.",
  },
  {
    id: "wudang",
    name: "Wudang",
    faction: "Orthodox Taoist",
    origin:
      "Mount Wudang, Hubei. Founded by a man who decided flowing robes and slow movements were, in fact, the peak of violence.",
    philosophy:
      "Use softness to overcome hardness. Win the fight by arriving late to it and yawning. The opponent's strength is the opponent's problem.",
    signatureTechniques: [
      { name: "Tai Chi Chuan", threat: 9 },
      { name: "Wudang Sword of Inner Peace", threat: 7 },
      { name: "Yielding Push That Ruins Lives", threat: 8 },
    ],
    famousPractitioners: ["Zhang Sanfeng", "Various Immortals", "One Determined Heron"],
    funFact:
      "A Wudang master once defeated seven opponents while literally taking a nap. The nap went on to become a grandmaster.",
    catchphrase: "I will defeat you with extreme relaxation.",
  },
  {
    id: "emei",
    name: "Emei",
    faction: "Orthodox (mostly)",
    origin:
      "Mount Emei, Sichuan. A school famous for elite swordswomen who kindly request you not make a 'mountain out of a molehill' joke.",
    philosophy:
      "Speed, grace, and a sharp blade. True elegance is making your opponent look clumsy before they fall.",
    signatureTechniques: [
      { name: "Emei Piercing Sword", threat: 8 },
      { name: "Thousand-Mile Eyebrow Raise", threat: 5 },
      { name: "Disapproving Sigh Slash", threat: 7 },
    ],
    famousPractitioners: ["Abbess Miejue (no, she's not happy)", "Zhou Zhiruo", "Guo Xiang"],
    funFact:
      "The Emei school's training regimen is 80% swordplay and 20% perfecting the art of the cold stare.",
    catchphrase: "I could cut you, but my blade would judge me.",
  },
  {
    id: "beggar",
    name: "Beggar's Sect",
    faction: "Orthodox, surprisingly",
    origin:
      "Everywhere there are hungry people, which is everywhere. The largest martial organization in the kung fu world and the only one with an all-you-can-eat buffet membership.",
    philosophy:
      "Solidarity of the downtrodden. Also: hitting people with a stick. The stick is key.",
    signatureTechniques: [
      { name: "Eighteen Dragon-Subduing Palms", threat: 9 },
      { name: "Dog-Beating Staff Technique", threat: 8 },
      { name: "Strategic Asking-For-Spare-Change Feint", threat: 4 },
    ],
    famousPractitioners: [
      "Qiao Feng (legend, also tragic)",
      "Hong Qigong (loves his roast chicken)",
      "Lu Youqiao",
    ],
    funFact:
      "The Dog-Beating Staff was named to honor a dog. The dog was not honored.",
    catchphrase: "Spare some change? No? Then spare some teeth.",
  },
  {
    id: "tang",
    name: "Tang Sect",
    faction: "Unorthodox",
    origin:
      "Sichuan. A family business of hidden weapons and poison that takes 'don't bring a knife to a gunfight' to its logical, poisoned conclusion.",
    philosophy:
      "If you fight fair, you've already lost. Why punch when you can throw a needle that makes the puncher cry and also die?",
    signatureTechniques: [
      { name: "Ten Thousand Poison Needles", threat: 9 },
      { name: "Smoke Bomb of Polite Exit", threat: 6 },
      { name: "The Handshake of Regret", threat: 8 },
    ],
    famousPractitioners: ["The Tang Patriarch", "Several Apologetic Grandsons", "One Very Nervous Bride"],
    funFact:
      "A Tang Sect assassin's business card just says 'Sorry' in fancy calligraphy.",
    catchphrase: "We don't fight fair. We don't fight at all, ideally.",
  },
  {
    id: "ancient-tomb",
    name: "Ancient Tomb Sect",
    faction: "Hermitic",
    origin:
      "A literal tomb, because training in a normal location was too cheerful. Founded by someone who took 'resting in peace' as a lifestyle suggestion.",
    philosophy:
      "Sever all worldly ties. If you must love, love tragically. If you must fight, fight beautifully and then cry about it.",
    signatureTechniques: [
      { name: "Jade Maiden Sutra", threat: 8 },
      { name: "Heart of Frozen Tears", threat: 7 },
      { name: "The Longing Stare (debuff: opponent is now sad)", threat: 5 },
    ],
    famousPractitioners: [
      "Xiaolongnü (lives in a tomb, has never heard of brunch)",
      "Lin Chaoying",
      "Yang Guo (one-armed, very dramatic about it)",
    ],
    funFact:
      "Ancient Tomb Sect disciples are forbidden from laughing. The longest recorded streak of not-laughing is held by a statue.",
    catchphrase: "I feel nothing. (This is a technique, not a mood.)",
  },
  {
    id: "ming-cult",
    name: "Ming Cult",
    faction: "The 'Evil Cult' (translation: not invited to the orthodox parties)",
    origin:
      "Persia, originally. Came to China, got labeled evil, decided to lean into it for branding reasons.",
    philosophy:
      "Light will conquer darkness. The orthodox sects called us evil first, so we got matching outfits and a great anthem. Haters make you famous.",
    signatureTechniques: [
      { name: "Heaven and Earth Great Shift", threat: 9 },
      { name: "Solar Flame Saber", threat: 8 },
      { name: "Coordinated Group Disapproval", threat: 6 },
    ],
    famousPractitioners: [
      "Zhang Wuji (too nice for this, frankly)",
      "The Bright Messengers (Yang Xiao, Fan Yao)",
      "Wei Yixiao (the Bat King, runs fast, eats little)",
    ],
    funFact:
      "The Ming Cult was so good at being 'evil' that the actual Ming Dynasty borrowed their name. The Cult did not receive royalties.",
    catchphrase: "We're the villains? Bold of you to assume there's a script.",
  },
  {
    id: "huashan",
    name: "Huashan Sword Sect",
    faction: "Orthodox (when they're not arguing)",
    origin:
      "Mount Hua, Shaanxi. A prestigious sword school famous for, of all things, a debate so fierce it split the school in two. Over a manual.",
    philosophy:
      "The sword is mightier than the pen. The pen, however, started the fight.",
    signatureTechniques: [
      { name: "Huashan Swordsmanship", threat: 8 },
      { name: "Jade Maiden Nineteen Stances", threat: 7 },
      { name: "The Pointed Comment", threat: 4 },
    ],
    famousPractitioners: [
      "Yue Buqun (smiles a lot, do NOT trust)",
      "Linghu Chong (drinks, wins anyway)",
      "Feng Qingyang (retired, still judging everyone)",
    ],
    funFact:
      "The Huashan sect once divided into Qi and Sword factions after a debate that lasted three days. No one remembers who won. Everyone lost.",
    catchphrase: "We are the sword. We are also the problem.",
  },
];

export function findFaction(id: string): KungfuFaction | undefined {
  return KUNGFU_FACTIONS.find((s) => s.id === id);
}
