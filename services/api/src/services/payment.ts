/// <reference path="../types/opossum.d.ts" />

import fs from 'fs';
import path from 'path';
import CircuitBreaker from 'opossum';

type PaymentDemoMode = 'normal' | 'down' | 'timeout';

const demoDirectory = path.resolve(__dirname, '../../demo');
const demoModePath = path.join(demoDirectory, 'payment-mode.json');
const demoEventsPath = path.join(demoDirectory, 'payment-events.json');

// Mock payment gateway call
const processPaymentGateway = async (userId: string, amount: number, token: string): Promise<string> => {
  const demoMode = readPaymentDemoMode();
  recordPaymentAttempt({ amount, mode: demoMode, userId });

  if (demoMode === 'down') {
    throw new Error('Payment gateway demo outage');
  }

  if (demoMode === 'timeout') {
    await new Promise(resolve => setTimeout(resolve, 10_000));
    throw new Error('Payment gateway demo timeout');
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Randomly fail to simulate unstable payment gateway
  if (Math.random() < 0.3) {
    throw new Error('Payment Gateway Error');
  }

  return 'txn_' + Math.random().toString(36).substr(2, 9);
};

export const breakerOptions = {
  timeout: 3000, // If function takes longer than 3 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
  resetTimeout: 10000 // After 10 seconds, try again (half-open)
};

export const createPaymentCircuitBreaker = (
  gateway: typeof processPaymentGateway = processPaymentGateway,
  options: Record<string, number> = breakerOptions
) => {
  const breaker = new CircuitBreaker(gateway, options);

  breaker.fallback(async () => {
    throw new Error('Payment Service is currently unavailable. Please try again later.');
  });

  breaker.on('open', () => console.log('Payment Circuit Breaker is OPEN'));
  breaker.on('halfOpen', () => console.log('Payment Circuit Breaker is HALF-OPEN'));
  breaker.on('close', () => console.log('Payment Circuit Breaker is CLOSED'));

  return breaker;
};

export const paymentCircuitBreaker = createPaymentCircuitBreaker();

const readPaymentDemoMode = (): PaymentDemoMode => {
  const envMode = parsePaymentDemoMode(process.env.PAYMENT_DEMO_MODE);

  if (envMode) {
    return envMode;
  }

  try {
    const rawMode = JSON.parse(fs.readFileSync(demoModePath, 'utf8')) as { mode?: string };
    return parsePaymentDemoMode(rawMode.mode) ?? 'normal';
  } catch {
    return 'normal';
  }
};

const parsePaymentDemoMode = (mode: string | undefined): PaymentDemoMode | null => {
  if (mode === 'normal' || mode === 'down' || mode === 'timeout') {
    return mode;
  }

  return null;
};

const recordPaymentAttempt = ({
  amount,
  mode,
  userId
}: {
  amount: number;
  mode: PaymentDemoMode;
  userId: string;
}) => {
  try {
    fs.mkdirSync(demoDirectory, { recursive: true });
    const currentEvents = readPaymentEvents();
    currentEvents.push({
      amount,
      mode,
      userId,
      at: new Date().toISOString()
    });
    fs.writeFileSync(demoEventsPath, JSON.stringify(currentEvents, null, 2));
  } catch {
    // Demo logging must never affect payment behavior.
  }
};

const readPaymentEvents = () => {
  try {
    return JSON.parse(fs.readFileSync(demoEventsPath, 'utf8')) as Array<{
      amount: number;
      at: string;
      mode: PaymentDemoMode;
      userId: string;
    }>;
  } catch {
    return [];
  }
};
