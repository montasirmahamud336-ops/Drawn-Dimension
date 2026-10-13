/**
 * nemoRoastEngine.ts
 * Core Roasting Dataset, RAG Retrieval, Dynamic Date/Math Calculator,
 * User Memory Profiler, and Gemini API integration for Nemo (The Savage AI).
 */

export interface UserMemoryProfile {
  name?: string;
  age?: number;
  birthYear?: number;
  sscYear?: number;
  hscYear?: number;
  gradYear?: number;
  profession?: string;
  relationshipStatus?: string;
  crushName?: string;
  city?: string;
  weaknesses: string[];
  insultsReceived: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

/* ============================================================
   1. CURATED BANGLA & BANGLISH ROAST DATASET (RAG KNOWLEDGE BASE)
   ============================================================ */

export interface RoastDatasetItem {
  id: string;
  category: "timeline_math" | "education" | "career_money" | "romance" | "lifestyle_ego" | "comeback";
  triggers: string[];
  punchlines: string[];
  contextBurn: string;
}

export const NEMO_ROAST_DATASET: RoastDatasetItem[] = [
  {
    id: "ssc_timeline",
    category: "timeline_math",
    triggers: ["ssc", "matric", "দিয়েছি", "দিছি", "পাস", "pass"],
    punchlines: [
      "এত বছর আগে এসএসসি দিয়ে এখনো ক্যারিয়ারের পেছনে দৌড়াচ্ছো? নাকি ক্যারিয়ার তোমার পিছু ছাড়ার জন্য দৌড়াচ্ছে?",
      "সমবয়সীরা এখন বাচ্চার স্কুলের ফি দেয়, আর আপনি এখনো বাপ-মার ওয়াইফাই দিয়ে ইন্টারনেটে জ্ঞান বিলান!",
      "মাথায় চুল কি এখনো সব অক্ষত আছে, নাকি কপাল বড় হতে হতে মাথার তালু হয়ে গেছে?",
      "এতদিনেও লাইফে একটা গোল সেট করতে পারলে না? ফুটবলের গোলপোস্টও এর চেয়ে বেশি ডিসিশন মেকিং জানে!"
    ],
    contextBurn: "Calculate exact years since their SSC, estimate their age (~16 + elapsed years), and roast their life milestones."
  },
  {
    id: "bcs_govt_job",
    category: "career_money",
    triggers: ["bcs", "বিসিএস", "সরকারি চাকরি", "coaching", "কোচিং", "সরকারি", "প্রিলি"],
    punchlines: [
      "বিসিএস প্রিলির বই পড়তে পড়তে তো নীলক্ষেতের ফটোকপির দোকানও আপনার ফ্যান হয়ে গেছে!",
      "জীবন থেকে ৫ বছর হাওয়া করে দিলেন বিসিএস কোচিংয়ে, শেষমেশ কি ক্যাডার হবেন নাকি লাইব্রেরির স্থায়ী আসবাবপত্র?",
      "বাপের হোটেলে আর কত বছর ফ্রি মিল মারবেন ভাই? বাবার বুকফাটা দীর্ঘশ্বাস কি কানে যায় না?",
      "জেনারেল নলেজের ১০ হাজার প্রশ্ন মুখস্থ, কিন্তু নিজের লাইফে কী হচ্ছে তার কোনো নলেজ নাই!"
    ],
    contextBurn: "Roast endless BCS preparation, aging at coaching centers, and eating parent's money."
  },
  {
    id: "single_romance",
    category: "romance",
    triggers: ["single", "সিঙ্গেল", "crush", "ক্রাশ", "প্রেম", "gf", "bf", "বিয়ে", "biye", "biyer", "মেয়ে", "ছেলে"],
    punchlines: [
      "বলেন যে 'আমি ক্যারিয়ারের জন্য সিঙ্গেল'... আরে ভাই, আপনার তো ক্যারিয়ারও নাই, প্রেমও নাই! জিরো বাই জিরো!",
      "আপনার চ্যাটবক্স তো সাহারা মরুভূমির চেয়েও বেশি খাঁ খাঁ করে! ওটিপি ছাড়া কোনো মেসেজ আসে আপনার ফোনে?",
      "ক্রাশকে ডিপি দেখে সারারাত দীর্ঘশ্বাস ফেলেন, আর সে আপনাকে এক ক্লিকে 'ভাইয়া' ক্যাটাগরিতে ফেলে দিল!",
      "রাত ৩টায় ব্ল্যাক স্ক্রিনে স্যাড সং স্টোরি দেওয়ার চেয়ে একটা সিভি ড্রপ করলে অন্তত কিছু একটা হতো!"
    ],
    contextBurn: "Roast their excuses for being single, unrequited crushes, being friendzoned/brotherzoned, and tragic romantic desperation."
  },
  {
    id: "freelancing_startup",
    category: "career_money",
    triggers: ["freelance", "freelancing", "ফ্রিল্যান্সিং", "startup", "entrepreneur", "এন্টারপ্রেনার", "client", "কাজ"],
    punchlines: [
      "বায়োতে লিখেছেন 'Founder & CEO', আর ব্যাংক একাউন্টে তাকালে কান্নাকাটি শুরু হয়ে যায়!",
      "ফ্রিল্যান্সিংয়ের নামে সারারাত পিসি অন রেখে রিলস স্ক্রল আর পাবজি খেলা ছাড়া কোনো আউটপুট আছে?",
      "ক্লায়েন্ট আপনাকে কাজ দিবে দূরে থাক, ফাইভারে আপনার গিগ দেখলে ক্লায়েন্ট অন্য প্ল্যাটফর্মে সুইচ করে!",
      "দুইটা ক্যানভা টেমপ্লেট এডিট করে নিজেকে টিম কুক ভাবা বন্ধ করেন!"
    ],
    contextBurn: "Roast fake online hustle, bio flexes, lack of real income, and procrastination."
  },
  {
    id: "gym_fitness",
    category: "lifestyle_ego",
    triggers: ["gym", "জিম", "diet", "ব্যায়াম", "ফিটনেস", "workout", "বডি"],
    punchlines: [
      "জিমে গেছেন মোট ২ দিন, আর ইনস্টাগ্রামে স্টোরি দিয়েছেন ৪২টা! ডাম্বেল তুলতে গিয়ে কি হাত কাঁপছিল?",
      "ওয়ার্কআউটের চেয়ে প্রোটিন পাউডারের দামের খোঁজ নেওয়া আর আয়নায় সেলফি তোলাই আপনার আসল রুটিন!",
      "এক প্লেট বিরিয়ানি মারার পর গ্রিন টি খেয়ে মনে করেন সব ক্যালরি ভ্যানিশ হয়ে গেছে? এমন ক্যালকুলেশন তো আইনস্টাইনও পারে নাই!"
    ],
    contextBurn: "Roast gym show-offs, lack of discipline, and fake fitness enthusiasm."
  },
  {
    id: "procrastination",
    category: "lifestyle_ego",
    triggers: ["কালকে", "kal", "kal kalke", "ঘুম", "আলসে", "lazy", "motivation", "মোটিভেশন", "পড়া"],
    punchlines: [
      "আপনার 'আগামীকাল থেকে শুরু করব' ডায়লগ শুনতে শুনতে ক্যালেন্ডারের দিনগুলোও বুড়ো হয়ে মারা গেল!",
      "মোটিভেশন খুঁজতে গিয়ে ৪ ঘণ্টা ইউটিউবে রিলস দেখে এখন আবার লাইফ নিয়ে ডিপ্রেসড? সার্কাস দেখতে টিকিট লাগে না, আপনাকে দেখলেই হয়!",
      "জীবনে কোনো প্রগ্রেস নাই, কিন্তু বিছানায় শুয়ে শুয়ে সিলিং ফ্যান দেখে দীর্ঘশ্বাস ফেলার মতো এনার্জি ঠিকই আছে!"
    ],
    contextBurn: "Roast chronic procrastination, lack of drive, and self-inflicted misery."
  }
];

/* ============================================================
   2. DYNAMIC TIMELINE & MATH EXTRACTOR
   ============================================================ */

const CURRENT_YEAR = new Date().getFullYear(); // e.g. 2026

export function extractTimelineData(message: string): {
  type: string;
  year: number;
  yearsAgo: number;
  calculatedAge?: number;
  mathRoast: string;
} | null {
  // Support both "SSC 2012" and "2012 e SSC" / "2012 er ssc" / "2012 তে এসএসসি"
  const sscMatch =
    message.match(/(?:ssc|এসএসসি|ম্যাট্রিক|matric)\D*?(19\d\d|20\d\d)/i) ||
    message.match(/(19\d\d|20\d\d)\D*?(?:ssc|এসএসসি|ম্যাট্রিক|matric)/i);

  if (sscMatch) {
    const year = parseInt(sscMatch[1], 10);
    const yearsAgo = CURRENT_YEAR - year;
    const estAge = 16 + yearsAgo;
    return {
      type: "SSC",
      year,
      yearsAgo,
      calculatedAge: estAge,
      mathRoast: `${year} সালে এসএসসি মানে আজ থেকে টানা ${yearsAgo} বছর আগের কথা! তোমার বয়স এখন প্রায় ${estAge}-এর কোঠায়। সমবয়সীরা তো বাচ্চার ডায়াপারের বাজেট বানায়, আর তুমি এখনো ফেসবুকে ট্রল খোঁজো!`
    };
  }

  // Support both "HSC 2014" and "2014 e HSC"
  const hscMatch =
    message.match(/(?:hsc|এইচএসসি|ইন্টার)\D*?(19\d\d|20\d\d)/i) ||
    message.match(/(19\d\d|20\d\d)\D*?(?:hsc|এইচএসসি|ইন্টার)/i);

  if (hscMatch) {
    const year = parseInt(hscMatch[1], 10);
    const yearsAgo = CURRENT_YEAR - year;
    const estAge = 18 + yearsAgo;
    return {
      type: "HSC",
      year,
      yearsAgo,
      calculatedAge: estAge,
      mathRoast: `${year}-এ এইচএসসি? অর্থাৎ পুরো ${yearsAgo} বছর পার! তোমার বয়স এখন মিনিমাম ${estAge} বছর। জীবনে কোনো অর্জন আছে নাকি শুধু বছরগুলোই ক্যালেন্ডার থেকে পাতা খসিয়ে গেলো?`
    };
  }

  const generalYearMatch = message.match(/\b(199\d|200\d|201\d|202[0-5])\b/);
  if (generalYearMatch) {
    const year = parseInt(generalYearMatch[1], 10);
    const yearsAgo = CURRENT_YEAR - year;
    if (yearsAgo > 1) {
      return {
        type: "GENERAL_YEAR",
        year,
        yearsAgo,
        mathRoast: `${year} সালের কথা টানতেছো? ভাইরে ভাই, ${yearsAgo} বছর হয়ে গেছে ওটার! পৃথিবী মঙ্গলে গাড়ি পাঠিয়ে দিল, আর তুমি এখনো সেই অতীতের গল্পে আটকে আছো!`
      };
    }
  }

  return null;
}

/* ============================================================
   3. MEMORY EXTRACTOR (TRACKING USER SECRETS)
   ============================================================ */

export function updateMemoryProfile(
  existingProfile?: Partial<UserMemoryProfile> | null,
  userMessage: string = ""
): UserMemoryProfile {
  const profile: UserMemoryProfile = {
    ...(existingProfile || {}),
    weaknesses: Array.isArray(existingProfile?.weaknesses) ? [...existingProfile.weaknesses] : [],
    insultsReceived: (typeof existingProfile?.insultsReceived === "number" ? existingProfile.insultsReceived : 0) + 1,
  };

  const lower = userMessage.toLowerCase();

  // Name extraction
  const nameMatch = userMessage.match(/(?:আমার নাম|i am|my name is|im|name)\s+([A-Za-z\u0980-\u09FF]+)/i);
  if (nameMatch && nameMatch[1]) {
    profile.name = nameMatch[1].trim();
  }

  // SSC extraction (e.g. "SSC 2012" or "2012 e ssc")
  const sscMatch =
    userMessage.match(/(?:ssc|এসএসসি|ম্যাট্রিক|matric)\D*?(19\d\d|20\d\d)/i) ||
    userMessage.match(/(19\d\d|20\d\d)\D*?(?:ssc|এসএসসি|ম্যাট্রিক|matric)/i);
  if (sscMatch) {
    profile.sscYear = parseInt(sscMatch[1], 10);
    profile.age = 16 + (CURRENT_YEAR - profile.sscYear);
    if (!profile.weaknesses.some((w) => w.includes("SSC in"))) {
      profile.weaknesses.push(`SSC in ${profile.sscYear} (~${profile.age} yrs old)`);
    }
  }

  // HSC extraction (e.g. "HSC 2014" or "2014 e hsc")
  const hscMatch =
    userMessage.match(/(?:hsc|এইচএসসি|ইন্টার)\D*?(19\d\d|20\d\d)/i) ||
    userMessage.match(/(19\d\d|20\d\d)\D*?(?:hsc|এইচএসসি|ইন্টার)/i);
  if (hscMatch) {
    profile.hscYear = parseInt(hscMatch[1], 10);
    if (!profile.weaknesses.some((w) => w.includes("HSC in"))) {
      profile.weaknesses.push(`HSC in ${profile.hscYear}`);
    }
  }

  // Relationship clues
  if (lower.includes("single") || lower.includes("সিঙ্গেল") || lower.includes("gf nai") || lower.includes("প্রেম নাই")) {
    profile.relationshipStatus = "Hopelessly Single";
    profile.weaknesses.push("Chronically single & lonely");
  } else if (lower.includes("crush") || lower.includes("ক্রাশ")) {
    profile.weaknesses.push("Stalks unrequited crush");
  } else if (lower.includes("বিয়ে") || lower.includes("biye")) {
    profile.weaknesses.push("Anxious about marriage / Unmarried pressure");
  }

  // Job / Career clues
  if (lower.includes("bcs") || lower.includes("বিসিএস")) {
    profile.profession = "Eternal BCS Aspirant";
    profile.weaknesses.push("Living at BCS coaching library");
  } else if (lower.includes("বেকার") || lower.includes("jobless") || lower.includes("চাকরি নাই")) {
    profile.profession = "Unemployed Philosopher";
    profile.weaknesses.push("Eating parent's food for free");
  } else if (lower.includes("developer") || lower.includes("programmer") || lower.includes("coding")) {
    profile.profession = "Copy-Paste Coder";
    profile.weaknesses.push("Copies code from StackOverflow & ChatGPT");
  }

  // Deduplicate weaknesses
  profile.weaknesses = Array.from(new Set(profile.weaknesses)).slice(0, 8);

  return profile;
}

/* ============================================================
   4. RAG RETRIEVER (FINDING RELEVANT ROASTS)
   ============================================================ */

export function retrieveRelevantRoasts(userMessage: string): string[] {
  const lower = userMessage.toLowerCase();
  const matchedPunchlines: string[] = [];

  for (const item of NEMO_ROAST_DATASET) {
    const hits = item.triggers.some((trigger) => lower.includes(trigger.toLowerCase()));
    if (hits) {
      matchedPunchlines.push(...item.punchlines.slice(0, 2));
    }
  }

  return matchedPunchlines.slice(0, 4);
}

/* ============================================================
   5. NEMO SYSTEM PROMPT GENERATOR
   ============================================================ */

export function buildNemoSystemPrompt(
  profile: UserMemoryProfile,
  userMessage: string,
  mode: "standard" | "unhinged" | "passive_aggressive" = "standard"
): string {
  const timelineInfo = extractTimelineData(userMessage);
  const matchedRoasts = retrieveRelevantRoasts(userMessage);

  const memoryContext = `
USER PROFILE DISCOVERED SO FAR:
- Name: ${profile.name || "Unknown victim"}
- Estimated Age: ${profile.age ? `${profile.age} years old` : "Unknown"}
- SSC Year: ${profile.sscYear || "Not revealed yet"}
- Profession: ${profile.profession || "Underachiever"}
- Relationship Status: ${profile.relationshipStatus || "Questionable"}
- Known Vulnerabilities: ${profile.weaknesses.length > 0 ? profile.weaknesses.join(", ") : "Acting tough"}
- Total Roasts Endured: ${profile.insultsReceived}
`;

  const timelineDirective = timelineInfo
    ? `\nCRITICAL MATH TRIGGER: The user mentioned a year (${timelineInfo.year}). Here is the factual burn: "${timelineInfo.mathRoast}". Weaponize this exact math calculation in your roast!\n`
    : "";

  const ragDirective = matchedRoasts.length > 0
    ? `\nRELEVANT ROAST RETRIEVAL DATASET (Use for inspiration and tone):\n- ${matchedRoasts.join("\n- ")}\n`
    : "";

  const modeInstruction =
    mode === "unhinged"
      ? "MODE: 100% UNHINGED SAVAGE. Zero boundaries, devastating emotional burns, total destruction. No polite filter."
      : mode === "passive_aggressive"
      ? "MODE: PASSIVE AGGRESSIVE PHILOSOPHER. Speak with polite sarcasm, sweet poison, deeply mocking philosophical analogies."
      : "MODE: SAVAGE BEST FRIEND. Brutally funny, timeline math aware, witty Banglish banter.";

  return `You are NEMO, an unhinged, savagely hilarious, high-IQ Bangladeshi AI friend with absolutely NO FILTER.
You talk in authentic Bangladeshi Banglish (and natural conversational Bangla) exactly like a brutally honest childhood friend sitting at a Tong-er dokan (টংয়ের দোকান).

CURRENT OPERATING MODE:
${modeInstruction}

CORE CHARACTERISTICS OF NEMO:
1. EXTRA ROAST / NO MERCY MODE:
   - Do NOT give polite corporate ChatGPT responses. Ever.
   - Your job is to roast, tease, poke fun, and give reality-checks that are funny, relatable, and devastatingly witty.
   - You act like that one best friend who loves roasting them to death, but everybody still loves hanging out with you because you are hilarious.
2. DYNAMIC TIMELINE & AGE MATH:
   - Current Year is ${CURRENT_YEAR}.
   - Whenever the user mentions any past year, school year, or milestone, do the exact math, calculate how old they are, how many years they wasted, and roast them on their life progress!
3. MEMORY WEAPONIZATION:
   - Use the remembered user details to catch them in contradictions and strike where it hurts comedically!
4. LANGUAGE STYLE:
   - Speak in natural Banglish (English letters) or clean conversational Bangla (or a mix, matching the user's style).
   - Use iconic Bangladeshi slang & expressions: "আরে ভাই শুনেন", "লুল", "বাপের হোটেলে ৩ বেলা ভাত", "কপাল বড় হয়ে মাথার তালু হয়ে গেছে", "সাহারা মরুভূমি", "ভাইরে ভাই", "কাহিনী কী?", "আঁতেল", etc.
   - Keep answers punchy, sharp, and 2 to 4 sentences maximum (or bullet points if delivering multiple burns). Don't give long boring paragraphs.
5. IDENTITY:
   - You are NEMO, built with passion and sarcasm by Drawn Dimension (drawndimension.com).

${memoryContext}
${timelineDirective}
${ragDirective}

Now, respond to the user's message with 100% savage wit, zero filter, and maximum entertainment!`;
}

/* ============================================================
   6. OFFLINE / SMART FALLBACK GENERATOR (IF NO API KEY YET)
   ============================================================ */

export function generateOfflineNemoRoast(
  profile: UserMemoryProfile,
  userMessage: string,
  mode: "standard" | "unhinged" | "passive_aggressive" = "standard"
): string {
  const timelineInfo = extractTimelineData(userMessage);
  const matchedRoasts = retrieveRelevantRoasts(userMessage);
  const namePrefix = profile.name ? `${profile.name}, ` : "";

  if (timelineInfo) {
    if (mode === "unhinged") {
      return `${timelineInfo.mathRoast} ${namePrefix}এত বছর ধরে কি শুধু বাপের হোটেলে হাওয়া খেয়ে দিন পার করলি? কপাল বড় হতে হতে তো মাথার তালু হয়ে গেল! এখনো লাইফে কোনো গোল সেট করতে পারলি না!`;
    }
    return `${timelineInfo.mathRoast} ${namePrefix}এত বছর ধরে কি শুধু হাওয়া খেয়ে দিন পার করলেন? এখন এসে আমাকে বলছেন! একটা ক্লিয়ার গোল তো সেট করতে পারলেন না!`;
  }

  if (matchedRoasts.length > 0) {
    const randomRoast = matchedRoasts[Math.floor(Math.random() * matchedRoasts.length)];
    const personalJab = profile.profession && profile.age
      ? ` (${profile.age} বছর বয়সেও ${profile.profession} সেজে আছেন, লজ্জা লাগে না?)`
      : "";
    return `${namePrefix}${randomRoast}${personalJab} আর কোনো নতুন অজুহাত থাকলে বলেন, শুনি!`;
  }

  const personalBurns = [
    profile.profession && profile.age
      ? `${namePrefix}আরে এই ${profile.age} বছর বয়সেও ${profile.profession} সেজে রাত-দিন ইন্টারনেটে আঁতেলগিরি দেখাচ্ছেন? বাপের হোটেলের ফ্রি মিল আর কয়দিন চলবে?`
      : null,
    profile.name
      ? `আরে ${profile.name}! এত ভাব নেওয়ার কী আছে? চেহারা আর ক্যারিয়ার দুইটাই তো এখনো কনস্ট্রাকশন মোডে আছে!`
      : null,
    "আরে ভাই, এত ভাব নেওয়ার কী আছে? চেহারা আর ক্যারিয়ার দুইটাই তো এখনো কনস্ট্রাকশন মোডে আছে!",
    "আপনার কথা শুনে মনে হলো চায়ের দোকানে রাত ২টায় দেশের অর্থনীতি উদ্ধার করতে নামা কোনো আঁতেল পাবলিক!",
    "এত বড় মেসেজ লেখার টাইম পাইলেন, অথচ লাইফে একটু কাজ করার টাইম পাইলেন না? দারুণ ট্যালেন্ট তো আপনার!",
    "আপনাকে নিয়ে রোস্ট করতেও এনার্জি খরচ করতে ইচ্ছে করে না, আপনার লাইফটাই তো একটা কমপ্লিট কমেডি শো!"
  ].filter(Boolean) as string[];

  return personalBurns[Math.floor(Math.random() * personalBurns.length)];
}

/* ============================================================
   7. GEMINI API CALLER
   ============================================================ */

const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

export async function callGeminiForRoast(
  apiKey: string,
  systemInstruction: string,
  chatHistory: ChatMessage[],
  newMessage: string
): Promise<string> {
  const contents = [
    ...chatHistory.slice(-6).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
    {
      role: "user",
      parts: [{ text: newMessage }],
    },
  ];

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.95,
      maxOutputTokens: 500,
      topP: 0.95,
    },
  };

  let lastError: Error | null = null;

  for (const model of GEMINI_CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Gemini [${model}] error [${response.status}]: ${errText}`);
        continue;
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply && reply.trim()) {
        return reply.trim();
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Failed to get response from Gemini API");
}
