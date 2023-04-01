import { v2 as cloudinary } from 'cloudinary';

//https://medium.com/codex/how-to-upload-images-to-cloudinary-using-nestjs-9f496460e8d7

import multer from 'multer';

export const CloudinaryProvider = {
  provide: 'Cloudinary',
  useFactory: (): void => {
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.CLOUD_API_KEY,
      api_secret: process.env.CLOUD_API_SECRET,
      secure: true,
    });
  },
};

//global configs

//NOTE//a/c --> github
