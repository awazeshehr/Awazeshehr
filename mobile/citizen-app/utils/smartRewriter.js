export const smartRewrite = (text) => {
  if (!text) return "";

  let refined = text;

  // 1. Expand common abbreviations (Textspeak -> Formal)
  const expansions = {
    "\\bplz\\b": "please",
    "\\bpls\\b": "please",
    "\\bu\\b": "you",
    "\\bur\\b": "your",
    "\\br\\b": "are",
    "\\bcuz\\b": "because",
    "\\bcoz\\b": "because",
    "\\bbcoz\\b": "because",
    "\\bthx\\b": "thank you",
    "\\bthanks\\b": "thank you",
    "\\basap\\b": "as soon as possible",
    "\\bgovt\\b": "government",
    "\\bdept\\b": "department",
    "\\bmsg\\b": "message",
    "\\bwanna\\b": "want to",
    "\\bgonna\\b": "going to",
    "\\bcant\\b": "cannot",
    "\\bdont\\b": "do not",
    "\\bwont\\b": "will not",
    "\\bim\\b": "I am",
    "\\bi\\b": "I",
    "\\bwat\\b": "water", // Common context specific
    "\\belec\\b": "electricity",
  };

  Object.keys(expansions).forEach((key) => {
    const regex = new RegExp(key, "gi");
    refined = refined.replace(regex, expansions[key]);
  });

  // 2. Fix capitalization for specific proper nouns / keywords
  const keywords = [
    "Karachi", "Lahore", "Islamabad", "Pakistan", 
    "WAPDA", "KE", "K-Electric", "NADRA", "Union Council",
    "Road", "Street", "Block", "Area", "Town", "Colony"
  ];

  keywords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    refined = refined.replace(regex, word);
  });

  // 3. Sentence Formatting
  // Capitalize first letter of sentences
  refined = refined.replace(/([.!?]\s+|^)([a-z])/g, (match) => match.toUpperCase());

  // 4. Tone Improvement (Contextual Wrappers)
  // If the text is short and blunt, make it polite.
  const lowerRefined = refined.toLowerCase();
  
  // Prefix if missing formal opening
  if (!lowerRefined.startsWith("respected") && !lowerRefined.startsWith("to the") && !lowerRefined.startsWith("dear")) {
    if (lowerRefined.length < 50) {
      refined = "I would like to report an issue: " + refined;
    } else {
      refined = "Respected Authorities, " + refined;
    }
  }

  // Suffix if missing formal closing
  if (!lowerRefined.includes("thank") && !lowerRefined.includes("regards")) {
    refined = refined.trim();
    if (!refined.endsWith(".")) refined += ".";
    refined += " I request you to look into this matter urgently. Thank you.";
  }

  // 5. Cleanup
  refined = refined.replace(/\s+/g, " ").trim(); // Remove double spaces

  return refined;
};
