import { Request, Response } from 'express';
import { checkInOnline, syncOfflineCheckins } from '../services/checkin';

export const postCheckin = async (req: Request, res: Response) => {
  try {
    const result = await checkInOnline(req.body.qrCode, req.user!.id);
    if (result.status === 'invalid') {
      return res.status(404).json({ success: false, error: 'QR Code not found or not confirmed' });
    }

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const postCheckinSync = async (req: Request, res: Response) => {
  const items = req.body.items ?? req.body.qrCodes?.map((qrCode: string) => ({ qrCode }));

  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }

  try {
    const results = await syncOfflineCheckins(items, req.user!.id);
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
