import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const tokenFile = __ENV.TOKENS_FILE || './registration-surge.tokens.json';
const metadataFile = __ENV.LOAD_TEST_METADATA_FILE || './registration-surge.metadata.json';
const metadata = JSON.parse(open(metadataFile));
const workshopId = __ENV.WORKSHOP_ID || metadata.workshopId;

if (!workshopId) {
  throw new Error('WORKSHOP_ID is required or must exist in the metadata file');
}

const tokens = new SharedArray('student tokens', () => JSON.parse(open(tokenFile)));

if (tokens.length === 0) {
  throw new Error('TOKENS_FILE must contain at least one bearer token');
}

export const options = {
  scenarios: {
    first_three_minutes: {
      executor: 'constant-arrival-rate',
      rate: 40,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: Number(__ENV.PREALLOCATED_VUS || 200),
      maxVUs: Number(__ENV.MAX_VUS || 1000)
    },
    remaining_seven_minutes: {
      executor: 'constant-arrival-rate',
      startTime: '3m',
      rate: 80,
      timeUnit: '7s',
      duration: '7m',
      preAllocatedVUs: Number(__ENV.PREALLOCATED_VUS || 200),
      maxVUs: Number(__ENV.MAX_VUS || 1000)
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.95']
  }
};

export default function () {
  const token = tokens[Math.floor(Math.random() * tokens.length)];
  const idempotencyKey = `${__VU}-${__ITER}-${Date.now()}`;
  const response = http.post(
    `${baseUrl}/api/workshops/${workshopId}/register`,
    JSON.stringify({}),
    {
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey
      }
    }
  );

  check(response, {
    'registration protected response': (res) => [200, 400, 429].includes(res.status),
    'no backend crash': (res) => res.status < 500
  });
}
