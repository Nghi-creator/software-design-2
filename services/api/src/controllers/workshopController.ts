import { Request, Response } from 'express';
import {
  createWorkshop,
  getWorkshopStats,
  getWorkshopSummaryStatus,
  listWorkshops
} from '../services/workshop';
import { registerForWorkshop } from '../services/registration';
import { getRequestUser } from '../types/request';
import { parseWorkshopListQuery } from '../lib/browseQuery';

export const getWorkshops = async (req: Request, res: Response) => {
  try {
    const workshops = await listWorkshops(parseWorkshopListQuery(req.query));

    res.json(workshops);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const postWorkshop = async (req: Request, res: Response) => {
  const { title, speaker, roomId, capacity, price, startTime, pdfUrl } = req.body;

  try {
    const workshop = await createWorkshop({
      title,
      speaker,
      roomId,
      capacity: Number(capacity),
      price: price === undefined ? undefined : Number(price),
      startTime,
      pdfUrl,
      pdfBuffer: req.file?.buffer
    });

    res.json(workshop);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const postWorkshopRegistration = async (req: Request, res: Response) => {
  const workshopId = req.params.id as string;
  const idempotencyKey = req.header('idempotency-key') as string;
  const user = getRequestUser(req);

  try {
    const registration = await registerForWorkshop({
      workshopId,
      userId: user.id,
      paymentToken: req.body.paymentToken,
      idempotencyKey
    });

    res.json({ success: true, registration });
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, error: error.message });
  }
};

export const getWorkshopStatistics = async (req: Request, res: Response) => {
  try {
    const stats = await getWorkshopStats(req.params.id as string);

    res.json(stats);
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, error: error.message });
  }
};

export const getWorkshopSummaryStatusController = async (req: Request, res: Response) => {
  try {
    const status = await getWorkshopSummaryStatus(req.params.id as string);

    res.json(status);
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, error: error.message });
  }
};
