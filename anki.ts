export type AnkiDeck = {
  notes: {
    fields: Record<string, string>;
    model: () => NoteModel;
  }[];
  media_files: string[];
  name: string;
  description: string;
};

export type NoteModel = {
  css: string;
  fieldNames: string[];
  noteTemplates: Record<
    string,
    {
      front: string;
      back: string;
    }
  >;
  name: string;
};
