import { Router } from 'express';
import { appointmentsRouter } from './appointments';
import { customersRouter } from './customers';
import { dashboardRouter } from './dashboard';
import { invoicesRouter } from './invoices';
import { repairsRouter } from './repairs';
import { schedulesRouter } from './schedules';
import { vehiclesRouter } from './vehicles';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/vehicles', vehiclesRouter);
apiRouter.use('/schedules', schedulesRouter);
apiRouter.use('/appointments', appointmentsRouter);
apiRouter.use('/repairs', repairsRouter);
apiRouter.use('/invoices', invoicesRouter);
