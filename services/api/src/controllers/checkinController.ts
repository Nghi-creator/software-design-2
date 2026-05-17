import { Request, Response } from 'express';
import { checkInOnline, generateRegistrationQr, syncOfflineCheckins } from '../services/checkin';
import { getRequestUser } from '../types/request';

export const getRegistrationQr = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const qr = await generateRegistrationQr({
      registrationId: req.params.registrationId as string,
      requesterId: user.id,
      requesterRole: user.role
    });

    res.json({ success: true, qr });
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, error: error.message });
  }
};

export const postCheckin = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const result = await checkInOnline(req.body.qrCode, user.id);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const postCheckinSync = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const results = await syncOfflineCheckins(req.body.items, user.id);
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
