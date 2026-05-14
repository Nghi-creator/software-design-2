import express from 'express';
import cors from 'cors';
import workshopRoutes from './routes/workshop';
import checkinRoutes from './routes/checkin';
import roomRoutes from './routes/room';
import { attachUser } from './middleware/auth';

const app = express();

app.use(cors());
app.use(express.json());
app.use(attachUser);

app.use('/api/workshops', workshopRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/rooms', roomRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
