import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], //enable built-in text-based logger//can switch it with a custom logger middleware
  });
  //parse cookies
  app.use(cookieParser());

  //enable cors
  app.enableCors({ origin: ['http://localhost:5173'], credentials: true });
  //by default, json and urlencoded data is parsed using the package body-parser
  //If we want to bind middleware to every registered route at once, we can use the use() method
  //app.use(logger);

  //initialize Swagger//generates all our endpoints//can be used as postman//--> http://localhost:3000/api//use postman for now
  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(4000);

  console.log(`Server running on port: 4000`);
}
bootstrap();
