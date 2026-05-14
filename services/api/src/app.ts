import express from 'express';
import cors from 'cors';
import workshopRoutes from './routes/workshop';
import checkinRoutes from './routes/checkin';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/workshops', workshopRoutes);
app.use('/api/checkin', checkinRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
