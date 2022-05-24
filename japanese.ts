export const JapaneseRegexString = "(?:[一-龠]|[ぁ-ゔ]|[ァ-ヴー]|[a-zA-Z0-9]|[ａ-ｚＡ-Ｚ０-９]|[々〆〤])+";
export const JapaneseRegexStringSpaced = "(?:[一-龠]|[ぁ-ゔ]|[ァ-ヴー]|[a-zA-Z0-9]|[ａ-ｚＡ-Ｚ０-９]|[々〆〤]|[ ])+";

export const convertAnkiFuriganaToRuby = (s: string) => {
  const newRegex = new RegExp(`(?<=(\\s|^))(${JapaneseRegexString})\\\[(${JapaneseRegexStringSpaced})\\\]`, "gu"); //\b doesn't work because it relies on \w, which is [A-Za-z0-9]
  // lookahead for \\s|^ = \b, but don't capture it.

  //@ts-ignore
  const out = s.replace(newRegex, (match) => {
    const phrase = match.split("[")[0];
    const reading = match.split("[")[1].split("]")[0];
    return `<ruby>${phrase}<rt>${reading}</rt></ruby>`;
  });

  return out.replaceAll(/ /g, "");
};