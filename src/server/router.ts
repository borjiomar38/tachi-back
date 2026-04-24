import { InferRouterInputs, InferRouterOutputs } from '@orpc/server';

import accountRouter from './routers/account';
import chapterRouter from './routers/chapter';
import configRouter from './routers/config';
import contactRouter from './routers/contact';
import deviceRouter from './routers/device';
import jobRouter from './routers/job';
import licenseRouter from './routers/license';
import providerRouter from './routers/provider';
import userRouter from './routers/user';

export type Router = typeof router;
export type Inputs = InferRouterInputs<typeof router>;
export type Outputs = InferRouterOutputs<typeof router>;
export const router = {
  account: accountRouter,
  user: userRouter,
  config: configRouter,
  contact: contactRouter,
  chapter: chapterRouter,
  provider: providerRouter,
  license: licenseRouter,
  device: deviceRouter,
  job: jobRouter,
};
