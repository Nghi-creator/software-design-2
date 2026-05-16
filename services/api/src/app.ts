import express from 'express';
import cors from 'cors';
import workshopRoutes from './routes/workshop';
import checkinRoutes from './routes/checkin';
import roomRoutes from './routes/room';
import authRoutes from './routes/auth';
import importRoutes from './routes/import';
import { attachUser } from './middleware/auth';
import { logApiRequest } from './middleware/requestLogger';
import { logApiResponse } from './middleware/responseLogger';

const app = express();

app.use(cors());
app.use(logApiRequest);
app.use(logApiResponse);
app.use(express.json());
app.use(attachUser);

app.use('/api/auth', authRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/imports', importRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
