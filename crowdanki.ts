import he from "he";
import _, { flatten } from "lodash";
import { convertAnkiFuriganaToRuby } from "./anki";

export namespace Raw {
  export type Deck = {
    __type__: string;
    deck_configurations: DeckConfiguration[];
    desc: string;
    media_files: string[];
    name: string;
    note_models: NoteModel[];
    notes: Note[];
  };

  type DeckConfiguration = {
    name: string;
  };

  export type NoteModel = {
    css: string;
    flds: NoteField[];
    tmpls: { qfmt: string; afmt: string; name: string }[];
    crowdanki_uuid: string;
    name: string;
  };

  type NoteField = {
    name: string;
  };

  type Note = {
    fields: string[];
    note_model_uuid: string;
  };
}

export namespace Parsed {
  export type Deck = {
    media_files: string[];
    name: string;
    notes: Note[];
  };

  export type Note = {
    fields: Record<string, string>;
    model: () => any;
  };
}

export const ankiRawToDynamic = async (raw: Raw.Deck): Promise<DynamicAnkiDeck> => {
  const notes = raw.notes.map((n) => {
    const model = raw.note_models.find((nm) => nm.crowdanki_uuid === n.note_model_uuid)!;
    return {
      fields: _.fromPairs(model.flds.map((f, i) => [f.name, n.fields[i]])) as Record<string, string>,
      model: () => model,
    };
  });

  return {
    notes,
    media_files: raw.media_files,
    name: raw.name,
    description: raw.desc,
  };
};

export const fillAnkiTemplate = (
  ankiTemplate: string,
  fieldsToValue: Record<string, string>,
  options?: (name: string, value: string) => Partial<FieldOptions>
) => {
  _(fieldsToValue)
    .toPairs()
    .forEach(([name, value]) => {
      ankiTemplate = flattenField(ankiTemplate, name, value, options ? options(name, value) : {});
    });

  return extractScripts(fixControlChars(fixHr(fixBr(ankiTemplate))));
};

const flattenAnkiDeck = (d: DynamicAnkiDeck) => {
  const cards = d.notes.map((n) => {
    const m = n.model() as Raw.NoteModel;
    let front = m.tmpls[0].qfmt;
    let back = m.tmpls[0].afmt;
    /*

    m.flds.forEach(({ name }) => {
      front = flattenField(front, name, n.fields[name], "front");
      back = flattenField(back, name, n.fields[name], "back");
    });

    front = extractScripts(fixControlChars(fixBr(front)));
    back = extractScripts(fixControlChars(fixBr(back)));
    */

    return {
      id: n.fields["Index"],
      front: fillAnkiTemplate(front, n.fields),
      back: fillAnkiTemplate(back, n.fields),
      css: m.css,
      word: n.fields["Word"],
    };
  });

  return { ...d, cards };
};

type DynamicAnkiDeck = {
  notes: {
    fields: Record<string, string>;
    model: () => Raw.NoteModel;
  }[];
  media_files: string[];
  name: string;
  description: string;
};

export const parseCrowdAnki = async (rawDeck: Raw.Deck) => flattenAnkiDeck(await ankiRawToDynamic(rawDeck));

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

const extractScripts = (card: string) => {
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

export const ankiStyle = `
.card {
}
.flashcard, .refold-card {
  width: 95vw;
  box-sizing: border-box;
  height: fit-content;
}
.hint {
  cursor: pointer;
}

.replay-button svg {
  cursor: pointer;
}

.replay-button path {
  transform: scale(0.6) translate(12px, 14px) !important;
}
hr {
  margin-bottom: 0px;
}
`;