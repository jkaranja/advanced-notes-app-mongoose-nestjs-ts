//You implement custom Nest middleware in either a function, or in a class with an @Injectable() decorator. The class should implement the NestMiddleware interface, while the function does not have any special requirements.

//Nest middleware are, by default, equivalent to express middleware.

//using class
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    //console.log('Request...');
    next();
  }
}
//USE THIS MIDDLEWARE/FUNCTION ONLY FOR LOGGING TO FILE//CURRENTLY USING DEFAULT LOGGER
//or using functional middleware
// export function logger(req: Request, res: Response, next: NextFunction) {
//   console.log(`Request...`);
//   next();
// }
