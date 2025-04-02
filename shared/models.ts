export type NoteInfo = {
  title: string;
  lastEditTime: number;
};

export type NoteContent = string;

export type FullNote = NoteInfo & {
  content: NoteContent;
};
