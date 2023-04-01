import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from 'src/auth/auth.guard';
import { NotesService } from './notes.service';
import { Express } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { multerStorage } from 'src/util/multerOptions';

@Controller('api/notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(
    private notesService: NotesService,
    configService: ConfigService, //injecting env variables
  ) {}

  @Get()
  getAllNotes(@Query() query: any): any {
    return this.notesService.getAllNotes(query);
  }
  //note: this will cath both 'notes' and 'notes/id'//should come after static path: 'notes'
  @Get(':noteId')
  getNoteById(@Param('noteId') noteId: number): any {
    return this.notesService.getNoteById(noteId);
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      // must supply max no. of files= 20//i.e from 1 ->20 while using FilesInterceptor//not needed with FileInterceptor('upload', {})
      storage: multerStorage,
      //fileFilter: ()=>{}
      //limits: {}
    }),
  )
  createNewNote(
    @UploadedFiles() //will be UploadedFile() if using FileInterceptor for one file
    files: Array<Express.Multer.File>,
    @Body() newNoteDto: any,
    @Req() req: Request,
  ) {
    return this.notesService.createNewNote(files, newNoteDto, req);
  }

  @Patch(':noteId')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: multerStorage,
    }),
  )
  updateNote(
    @UploadedFiles() //will be UploadedFile() if using FileInterceptor for one file
    files: Array<Express.Multer.File>,
    @Param('noteId') noteId: number,
    @Body() updateNoteDto: any,
  ) {
    return this.notesService.updateNote(files, noteId, updateNoteDto);
  }

  @Delete(':noteId')
  deleteNote(@Param('noteId') noteId: number) {
    return this.notesService.deleteNote(noteId);
  }
}
