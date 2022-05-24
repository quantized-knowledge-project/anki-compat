import he from "he";
import _ from "lodash";
import { convertAnkiFuriganaToRuby } from "./japanese";

type FieldOptions = {
  mainAudio: boolean
  disableAutoplay: boolean
}

const flattenField = (card: string, name: string, value: string, options: Partial<FieldOptions>) => {
  ({ card, name, value } = flattenFieldConditionals(card, name, value));
  ({ card, name, value } = flattenFieldHint(card, name, value));

  //const autoplay =
  //(cardName === "front" && name === "word_audio") || (cardName === "back" && name === "sentence_audio");
  ({ card, name, value } = flattenFieldAudio(card, name, value, options));
  ({ card, name, value } = flattenFieldNormal(card, name, value));
  ({ card, name, value } = flattenFieldFurigana(card, name, value));
  return card;
};

const flattenFieldFurigana = (card: string, name: string, value: string) => {
  card = card.replaceAll(new RegExp(`{{furigana:${name}}}`, "g"), convertAnkiFuriganaToRuby(value));
  return { card, name, value };
};

const flattenFieldHint = (card: string, name: string, value: string) => {
  card = card.replaceAll(
    new RegExp(`{{hint:${name}}}`, "g"),
    `<em class="hint" id="hint-${name}" onClick=\${e => document.getElementById(\`hint-${name}\`).innerHTML=\`${value}\`}>${name}</em>`
  );
  return { card, name, value };
};

const flattenFieldAudio = (card: string, name: string, value: string, options: Partial<FieldOptions>) => {
  // https://www.wikiwand.com/en/Equilateral_triangle
  const triangleS = 35;
  const triangleH = (Math.sqrt(3) / 2) * triangleS;
  const radius = (2 * triangleH) / 3;
  const rectS = 2 * radius;

  const {disableAutoplay, mainAudio} = options;

  value = value.replaceAll(
    /\[sound:(.*)\]/g,
    (match, p1) =>
      `<audio id="audio-${name}" ${mainAudio ? `name="main-audio"` : ""} ${mainAudio && !disableAutoplay ? "autoplay" : ""} src="media/${p1}"></audio>
      <div class="replay-button">
        <svg style="overflow: visible" onClick=\${e => {const a = document.getElementById('audio-${name}'); a.currentTime = 0; a.play();}} viewBox="0 0 ${
        rectS + 10
      } ${rectS}" width="${rectS}px">
          <circle  fill="grey" stroke="black" cx="${radius}" cy="${radius}" r="${radius}" />
          <path fill="black" d="M ${rectS - triangleH} ${(rectS - triangleS) / 2} L ${rectS} ${rectS / 2} L ${
        rectS - triangleH
      } ${rectS - (rectS - triangleS) / 2} Z" />
        </svg>
      </div>
      `
  );
  return { card, name, value };
};

const removeScriptTags = (card: string) => {
  card = card.replaceAll(/<script>.*<\/script>/gms, "");
  return card;
};

const fixBr = (card: string) => card.replaceAll(/<\/br>/g, "").replaceAll("<br>", "<br/>");
const fixHr = (card: string) => card.replaceAll(/<\/hr>/g, "").replaceAll("<hr>", "<hr/>");
//const fixControlChars = (card: string) => card.replaceAll("&nbsp;", " ");
const fixControlChars = (card: string) => he.decode(card);

const flattenFieldNormal = (card: string, name: string, value: string) => {
  card = card.replaceAll(new RegExp(`{{${name}}}`, "g"), value);
  return { card, name, value };
};

const flattenFieldConditionals = (card: string, name: string, value: string) => {
  const isBlank = value.trim() === "";
  if (!isBlank) {
    card = card.replaceAll(new RegExp(`{{\\\^${name}}}.*?{{\/${name}}}`, "gms"), ""); // everything between tags

    card = card.replaceAll(new RegExp(`{{#${name}}}`, "g"), ""); // delete opening and closing tags
    card = card.replaceAll(new RegExp(`{{\/${name}}}`, "g"), ""); // delete opening and closing tags
  } else {
    card = card.replaceAll(new RegExp(`{{#${name}}}.*?{{\/${name}}}`, "gms"), ""); // everything between tags

    card = card.replaceAll(new RegExp(`{{\\\^${name}}}`, "g"), ""); // delete opening and closing tags
    card = card.replaceAll(new RegExp(`{{\/${name}}}`, "g"), ""); // delete opening and closing tags
  }

  return { card, name, value };
};

export const stripAnkiSoundFormat = (s: string) => {
  return s.replace("[sound:", "").replace("]", "");
};

export const toHTMLAudio = (ankiAudio: string) => {
  return `<audio src="${stripAnkiSoundFormat(ankiAudio)}"></audio>`;
};

type FieldName = string
type RawFieldValue = string

export const fillAnkiTemplate = (
  ankiTemplate: string,
  fieldsToValue: Record<FieldName, RawFieldValue>,
  options?: (name: string, value: string) => Partial<FieldOptions>
) => {
  _(fieldsToValue)
    .toPairs()
    .forEach(([name, value]) => {
      ankiTemplate = flattenField(ankiTemplate, name, value, options ? options(name, value) : {});
    });

  return removeScriptTags(fixControlChars(fixHr(fixBr(ankiTemplate))));
};