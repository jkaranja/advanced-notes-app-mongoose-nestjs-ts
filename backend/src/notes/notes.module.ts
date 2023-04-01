import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

import { MongooseModule } from '@nestjs/mongoose';

import { Note, NoteSchema } from './schemas/note.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { UsersModule } from 'src/users/users.module';
import mongoose from 'mongoose';

import Inc from 'mongoose-sequence';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore //ignore: wrong typing//the typing says the exported function expects a schema as its arg while docs says you should pass a mongoose instance
//const AutoIncrement = Inc(mongoose); //from typing, this should return void//ignore

@Module({
  imports: [
    //register the models in the current scope//use forFeatureAsync() when adding plugins for mongoose instead of forFeature
    MongooseModule.forFeatureAsync([
      {
        name: Note.name,
        useFactory: () => {
          const schema = NoteSchema;
          // schema.plugin(AutoIncrement, {
          //   inc_field: 'noteId',
          //   id: 'noteNums',
          //   start_seq: 500,
          // });
          return schema;
        },
      },
    ]),
    UsersModule, //now the note controller(notes scope/context) has access to anything exported by the users module//eg model
  ],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
