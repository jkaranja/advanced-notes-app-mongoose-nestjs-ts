export interface CreateNoteBody {
  title?: string;
  content?: string;
  deadline?: string;
  files?: string;
}

export interface UpdateNoteBody extends CreateNoteBody {
  noteId?: number;
}

export interface NotesQuery {
  page: number;
  size: number;
  startDate: string;
  endDate: string;
  searchTerm: string;
}
