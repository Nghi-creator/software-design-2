import assert from 'node:assert/strict';
import test from 'node:test';
import { createPaymentCircuitBreaker } from '../../../src/services/payment';

test('payment breaker returns the gateway transaction id while the gateway is healthy', async () => {
  const breaker = createPaymentCircuitBreaker(
    async () => 'txn-healthy',
    {
      timeout: 50,
      errorThresholdPercentage: 50,
      resetTimeout: 50
    }
  );

  try {
    const transactionId = await breaker.fire('student-1', 50, 'tok-1');

    assert.equal(transactionId, 'txn-healthy');
    assert.equal(breaker.opened, false);
  } finally {
    breaker.shutdown();
  }
});

test('payment breaker times out, opens, and fails fast without invoking the gateway again', async () => {
  let gatewayCalls = 0;
  const breaker = createPaymentCircuitBreaker(
    async () => {
      gatewayCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return 'too-late';
    },
    {
      timeout: 5,
      errorThresholdPercentage: 50,
      resetTimeout: 100,
      volumeThreshold: 1
    }
  );

  try {
    await assert.rejects(
      async () => breaker.fire('student-1', 50, 'tok-timeout'),
      /Payment Service is currently unavailable/
    );

    assert.equal(breaker.opened, true);
    assert.equal(gatewayCalls, 1);

    await assert.rejects(
      async () => breaker.fire('student-1', 50, 'tok-retry'),
      /Payment Service is currently unavailable/
    );

    assert.equal(gatewayCalls, 1);
  } finally {
    breaker.shutdown();
  }
});
