import express from 'express';
import cors from 'cors';
import workshopRoutes from './routes/workshop';
import checkinRoutes from './routes/checkin';
import roomRoutes from './routes/room';
import authRoutes from './routes/auth';
import importRoutes from './routes/import';
import notificationRoutes from './routes/notification';
import registrationRoutes from './routes/registration';
import { attachUser } from './middleware/auth';
import { logApiRequest } from './middleware/requestLogger';
import { logApiResponse } from './middleware/responseLogger';
import {
  preAuthRegistrationRateLimiter,
  rejectSoldOutRegistrations
} from './middleware/rateLimiter';

const app = express();

app.use(cors());
app.use(logApiRequest);
app.use(logApiResponse);
app.use(express.json());
app.post('/api/workshops/:id/register', preAuthRegistrationRateLimiter);
app.post('/api/workshops/:id/register', rejectSoldOutRegistrations);
app.use(attachUser);

app.use('/api/auth', authRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/registrations', registrationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
