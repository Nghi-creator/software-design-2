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

const breakerOptions = {
  timeout: 3000, // If function takes longer than 3 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
  resetTimeout: 10000 // After 10 seconds, try again (half-open)
};

export const paymentCircuitBreaker = new CircuitBreaker(processPaymentGateway, breakerOptions);

paymentCircuitBreaker.fallback(() => {
  throw new Error('Payment Service is currently unavailable. Please try again later.');
});

paymentCircuitBreaker.on('open', () => console.log('Payment Circuit Breaker is OPEN'));
paymentCircuitBreaker.on('halfOpen', () => console.log('Payment Circuit Breaker is HALF-OPEN'));
paymentCircuitBreaker.on('close', () => console.log('Payment Circuit Breaker is CLOSED'));
