/// <reference path="../types/opossum.d.ts" />

import CircuitBreaker from 'opossum';

// Mock payment gateway call
const processPaymentGateway = async (userId: string, amount: number, token: string): Promise<string> => {
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
