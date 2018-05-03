import {Test4Application} from './application';
import {ApplicationConfig} from '@loopback/core';

export {Test4Application};

export async function main(options?: ApplicationConfig) {
  const app = new Test4Application(options);
  await app.boot();
  await app.start();
  return app;
}
