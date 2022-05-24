import * as fs from "fs/promises";
import _ from "lodash";
import { AnkiDeck, NoteModel } from "./anki";

namespace CrowdAnki {
  export type Deck = {
    __type__: string;
    deck_configurations: DeckConfiguration[];
    desc: string;
    media_files: string[];
    name: string;
    note_models: CrowdAnki.NoteModel[];
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

const collapseCrowdAnkiDeck = async (raw: CrowdAnki.Deck): Promise<AnkiDeck> => {
  const notes = raw.notes.map((n) => {
    const crowdAnkiNoteModel = raw.note_models.find((nm) => nm.crowdanki_uuid === n.note_model_uuid)!;

    const model: NoteModel = {
      css: crowdAnkiNoteModel.css,
      fieldNames: crowdAnkiNoteModel.flds.map((s) => s.name),
      name: crowdAnkiNoteModel.name,
      noteTemplates: _.fromPairs(crowdAnkiNoteModel.tmpls.map((t) => [t.name, { front: t.qfmt, back: t.afmt }])),
    };
    return {
      fields: _.fromPairs(crowdAnkiNoteModel.flds.map((f, i) => [f.name, n.fields[i]])),
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

export const fromCrowdAnki = async (filename: string): Promise<AnkiDeck> => {
  const raw = JSON.parse(await fs.readFile(filename, "utf8")) as CrowdAnki.Deck;
  const ankiDeck = await collapseCrowdAnkiDeck(raw);
  return ankiDeck;
};
