import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { LoggerMiddleware } from './middleware/logger.middleware';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { NotesModule } from './notes/notes.module';
import { ThrottlerModule } from '@nestjs/throttler';

const MONGO_URI =
  'mongodb+srv://templatesAdmin:14xtemplatesx02@clustertemplates.y0hzxle.mongodb.net/authTemplateDB';

// import { AuthModule } from './auth/auth.module';
// import { NotesModule } from './notes/notes.module';
//Each application has at least one module, a root module. The root module is the starting point
@Module({
  //import modules for all features to root module

  imports: [
    MongooseModule.forRoot(MONGO_URI), //connect to db//forRoot() method accepts the same configuration object as mongoose.connect()
    ConfigModule.forRoot({ isGlobal: true }), //with this, don;t need dotenv package//the ConfigModule uses dotenv under the hood// this loads the appropriate .env file//environment variable key/value pairs are parsed and resolved
    ThrottlerModule.forRoot({
      ttl: 60, //in secs= 1min//wait for 1 min b4 trying again
      limit: 5, //5 attempts per ttl = 1 min
    }),
    UsersModule,
    AuthModule,
    NotesModule,
  ], //the list of imported modules that export the providers which are required in this module
  //We can add all controllers and providers in root module but this is not recommended
  // controllers: [AppController],
  // providers: [AppService],
})
//export class AppModule {}

//if using middleware
//Applying middleware to AppModule class
// Modules that include middleware have to implement the NestModule interface.
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('cats');
    //The forRoutes() method can take a single string, multiple strings, a RouteInfo object, a controller class and even multiple controller classes.
    //restrict to a specific req mtd
    //.forRoutes({ path: 'cats', method: RequestMethod.GET });// import the RequestMethod enum to reference the desired request method type.
    //.forRoutes(CatsController, ...);//middleware will be applied to all routes of these controllers

    //#Excluding routes
    //chain apply().exclude().forRoutes()//exclude mtd can take a single string, multiple strings, or a RouteInfo object identifying routes to be excluded
    //eg:
    //  .exclude(
    //   { path: 'cats', method: RequestMethod.GET },
    //   { path: 'cats', method: RequestMethod.POST },
    //   'cats/(.*)',
    // )
  }
}
