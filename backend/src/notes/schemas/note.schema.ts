import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, now } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

//Schemas can be created with NestJS decorators, or with Mongoose itself manually.
//Using decorators to create schemas greatly reduces boilerplate and improves overall code readability.

export type NoteDocument = HydratedDocument<Note>;

@Schema() //decorator marks a class as a schema definition.//maps class to db collection of same name + s= notes
export class Note {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop()
  title: string;

  @Prop()
  noteId: number;

  @Prop()
  content: string;

  @Prop()
  deadline: string;

  @Prop([{ path: String, filename: String, mimetype: String, size: Number }])
  files: Array<{
    path: string;
    filename: string;
    mimetype: string;
    size: number;
  }>;

  @Prop({ default: now() })
  createdAt: Date;

  @Prop({ default: now() })
  updatedAt: Date;
}

export const NoteSchema = SchemaFactory.createForClass(Note);
