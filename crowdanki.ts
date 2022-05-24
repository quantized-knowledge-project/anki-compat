import _ from "lodash";
import { fillAnkiTemplate } from "./fields";
import * as fs from "fs/promises";
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
      fieldNames: crowdAnkiNoteModel.flds.map(s => s.name),
      name: crowdAnkiNoteModel.name,
      noteTemplates: _.fromPairs(crowdAnkiNoteModel.tmpls.map(t => ([t.name, {front: t.qfmt, back: t.afmt}])))
    }
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


//const flattenAnkiDeck = (d: AnkiDeck) => {
//  const cards = d.notes.map((n) => {
//    const m = n.model() as CrowdAnki.NoteModel;
//    let front = m.tmpls[0].qfmt;
//    let back = m.tmpls[0].afmt;
//    /*
//
//    m.flds.forEach(({ name }) => {
//      front = flattenField(front, name, n.fields[name], "front");
//      back = flattenField(back, name, n.fields[name], "back");
//    });
//
//    front = extractScripts(fixControlChars(fixBr(front)));
//    back = extractScripts(fixControlChars(fixBr(back)));
//    */
//
//    return {
//      id: n.fields["Index"],
//      front: fillAnkiTemplate(front, n.fields),
//      back: fillAnkiTemplate(back, n.fields),
//      css: m.css,
//      word: n.fields["Word"],
//    };
//  });
//
//  return { ...d, cards };
//};

export const fromCrowdAnki = async (filename: string): Promise<AnkiDeck> => {
  const raw = JSON.parse(await fs.readFile(filename, "utf8")) as CrowdAnki.Deck;
  const ankiDeck = await collapseCrowdAnkiDeck(raw);
  return ankiDeck
}

//export const parseCrowdAnki = async (rawDeck: CrowdAnki.Deck) => flattenAnkiDeck(await ankiRawToDynamic(rawDeck));