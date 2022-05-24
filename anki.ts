type AnkiDeck = {
  notes: {
    fields: Record<string, string>;
    model: () => CrowdAnki.NoteModel;
  }[];
  media_files: string[];
  name: string;
  description: string;
};
