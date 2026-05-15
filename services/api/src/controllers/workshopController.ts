import { Request, Response } from 'express';
import { createWorkshop, listWorkshops } from '../services/workshop';
import { registerForWorkshop } from '../services/registration';
import { getRequestUser } from '../types/request';
import {
  getOptionalBooleanQuery,
  getOptionalDateQuery,
  getOptionalNumberQuery,
  getPaginationQuery,
  getSortOrderQuery,
  getStringQuery
} from '../lib/listQuery';

export const getWorkshops = async (req: Request, res: Response) => {
  try {
    const workshops = await listWorkshops({
      q: getStringQuery(req.query, 'q'),
      roomId: getStringQuery(req.query, 'roomId'),
      minPrice: getOptionalNumberQuery(req.query, 'minPrice'),
      maxPrice: getOptionalNumberQuery(req.query, 'maxPrice'),
      startsFrom: getOptionalDateQuery(req.query, 'startsFrom'),
      startsTo: getOptionalDateQuery(req.query, 'startsTo'),
      hasSeats: getOptionalBooleanQuery(req.query, 'hasSeats'),
      sortBy: getStringQuery(req.query, 'sortBy'),
      sortOrder: getSortOrderQuery(req.query),
      pagination: getPaginationQuery(req.query)
    });

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
