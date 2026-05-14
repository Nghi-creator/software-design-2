import { Request, Response } from 'express';
import { getCurrentUser, login, register } from '../services/auth';
import { getRequestUser } from '../types/request';

const sendAuthError = (res: Response, error: any) => {
  res.status(error.statusCode ?? 500).json({
    success: false,
    error: error.statusCode ? error.message : 'Authentication failed'
  });
};

export const postRegister = async (req: Request, res: Response) => {
  try {
    const result = await register(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    sendAuthError(res, error);
  }
};

export const postLogin = async (req: Request, res: Response) => {
  try {
    const result = await login(req.body);
    res.json(result);
  } catch (error: any) {
    sendAuthError(res, error);
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const requestUser = getRequestUser(req);
    const user = await getCurrentUser(requestUser.id);
    res.json({ user });
  } catch (error: any) {
    sendAuthError(res, error);
  }
};
