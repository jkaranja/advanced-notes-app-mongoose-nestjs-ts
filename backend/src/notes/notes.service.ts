import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { endOfDay, startOfDay } from 'date-fns';
import { Model } from 'mongoose';
import {
  CreateNoteBody,
  NotesQuery,
  UpdateNoteBody,
} from './interfaces/note.interface';
import { Note } from './schemas/note.schema';
import { Express } from 'express';
import cleanFiles from 'src/util/cleanFiles';
import deleteFiles from 'src/util/deleteFiles';

@Injectable()
export class NotesService {
  //inject a user model into the usersService using the @InjectModel() decorator:
  constructor(@InjectModel(Note.name) private noteModel: Model<Note>) {}
  /**----------------------------------
       GET NOTES
  ------------------------------------*/

  /**
   * @desc - Get all notes
   * @access - Private
   *
   */

  getAllNotes = async (notesQuery: NotesQuery) => {
    // Get all notes from MongoDB

    //const id = userCtx!._id;
    /**----------------------------------
         * PAGINATION
  ------------------------------------*/

    //query string payload
    const page = notesQuery.page || 1; //current page no. / sent as string convert to number//page not sent use 1
    const size = notesQuery.size || 15; //items per page//if not sent from FE/ use default 15
    const searchTerm = notesQuery.searchTerm || ''; //will be a case insensitive match//empty string match all
    const skip = (page - 1) * size; //eg page = 5, it has already displayed 4 * 10//so skip prev items

    //date range
    //if from fromDate:true, fetch all records not older than fromDate || no lower limit i.e not older than midnight of January 1, 1970//from midnight
    const startDate = notesQuery.startDate
      ? startOfDay(new Date(notesQuery.startDate))
      : startOfDay(new Date(0));
    // if toDate:true, fetch all records older than toDate || no upper limit i.e current date////end of day//up to midnight of that day
    const endDate = notesQuery.endDate
      ? endOfDay(new Date(notesQuery.endDate))
      : endOfDay(new Date());

    //format with date-fns or use: new Date(new Date(fromDate).setHours(0o0, 0o0, 0o0)), //start searching from the very beginning of our start date eg //=> Tue Sep 02 2014 00:00:00
    //new Date(new Date(toDate).setHours(23, 59, 59)), //up to but not beyond the last minute of our endDate /eg Tue Sep 02 2014 23:59:59.999
    //or use date-fns to add start of day & end of day

    //db.collection.find(filter/query/conditions, projection)//filter is the current term
    //can't use let query =  Note.query(). await query.count(), then await query.skip()//query already used/tracked with count()
    const filter = {
      $and: [
        // { user: id },
        { title: { $regex: `.*${searchTerm}.*`, $options: 'i' } }, //like %_keyword%  & case insensitive//
        {
          updatedAt: {
            $gte: startDate, //start searching from the very beginning of our start date
            $lte: endDate, //up to but not beyond the last minute of our endDate
          },
        },
      ],
    };

    const total = await this.noteModel.find(filter).count(); //or Note.countDocument() ///total docs

    //if total = 0 //error
    if (!total) {
      throw new BadRequestException('No notes found');
    }

    const pages = Math.ceil(total / size);

    //in case invalid page is sent//out of range//not from the pages sent
    if (page > pages) {
      throw new BadRequestException('Page not found');
    }

    const result = await this.noteModel
      .find(filter)
      .skip(skip)
      .limit(size)
      .sort({ updatedAt: -1 }) //desc//recent first
      .lean(); //return a pure js object//not mongoose document//don't convert result to mongoose document//about 5x smaller!//faster

    return {
      pages,
      total,
      notes: result,
    };
  };

  /**----------------------------------
       GET NOTE
  ------------------------------------*/

  /**
   * @desc - Get note
   * @access - Private
   *
   */
  getNoteById = async (noteId: number) => {
    // Get single note
    const note = await this.noteModel.findOne({ noteId }).exec();

    // If note not found
    if (!note) {
      throw new BadRequestException('Note not found');
    }

    return {
      files: note.files,
      //noteId: note.noteId,
      title: note.title,
      content: note.content,
      deadline: note.deadline,
    };
  };

  /**----------------------------------
      CREATE NOTE
  ------------------------------------*/

  /**
   * @desc - Create new note
   * @access - Private
   *
   */
  createNewNote = async (
    files: Array<Express.Multer.File>,
    noteBody: CreateNoteBody,
    req: Request,
  ) => {
    const { title, content, deadline } = noteBody;

    // Confirm data
    if (!title || !content || !deadline) {
      throw new BadRequestException('All fields are required');
    }

    // Create and store the new user
    const note = await this.noteModel.create({
      user: (req as any).user._id,
      noteId: Math.floor(Math.random() * 100000), //temp sol: gen number btw zero and 10000(exclusive)
      title,
      content,
      deadline,
      files: cleanFiles(files),
    });

    // Not created
    if (!note) {
      throw new BadRequestException('Invalid note data received');
    }

    return { message: 'New note created' };
  };

  /**----------------------------------
       UPDATE NOTE
  ------------------------------------*/

  /**
 * @desc - Update a note

 * @access - Private
 *
 */
  updateNote = async (
    files: Array<Express.Multer.File>,
    noteId: number,
    updateNoteBody: UpdateNoteBody,
  ) => {
    const { title, content, deadline } = updateNoteBody;

    // Confirm data
    if (!title || !content || !deadline) {
      throw new BadRequestException('All fields are requiredx');
    }

    // Confirm note exists to update
    //you can omit type for note//Ts will infer from type passed to model
    const note = await this.noteModel.findOne({ noteId }).exec();

    if (!note) {
      throw new BadRequestException('Note not found');
    }
    //if new files sent
    if (files?.length) {
      //clear old ones
      deleteFiles(note.files);
      //save new files
      note.files = cleanFiles(files);
    }
    note.title = title;
    note.content = content;
    note.deadline = deadline;

    const updatedNote = await note.save();

    return {
      files: updatedNote.files,
      //noteId: updatedNote.noteId,
      title: updatedNote.title,
      content: updatedNote.content,
      deadline: updatedNote.deadline,
    };
  };

  /**----------------------------------
       DEL NOTE
  ------------------------------------*/

  /**
 * @desc - Delete a note

 * @access - Private
 *
 */
  deleteNote = async (noteId: number) => {
    // Confirm note exists to delete
    const note = await this.noteModel.findOne({ noteId }).exec();

    if (!note) {
      throw new BadRequestException('Note not found');
    }

    deleteFiles(note.files); //del files for note

    await note.deleteOne();

    return { message: `Note deleted` };
  };
}
