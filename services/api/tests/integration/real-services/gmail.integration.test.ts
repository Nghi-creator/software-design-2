import assert from 'node:assert/strict';
import test from 'node:test';
import { GmailEmailTransport } from '../../../src/services/notificationChannels';

// Run with:
// RUN_GMAIL_TESTS=true MAIL_USER=... MAIL_PASS=... MAIL_TEST_TO=... npm test
const skipReason = getGmailSkipReason();

test('real Gmail SMTP transport sends a live message', { skip: skipReason }, async () => {
  const transport = new GmailEmailTransport({
    user: process.env.MAIL_USER as string,
    pass: process.env.MAIL_PASS as string
  });

  await transport.send({
    to: process.env.MAIL_TEST_TO as string,
    subject: `UniHub Gmail integration ${Date.now()}`,
    text: 'Live Gmail transport verification from UniHub test suite.'
  });

  assert.ok(true);
});

function getGmailSkipReason() {
  if (process.env.RUN_GMAIL_TESTS !== 'true') {
    return 'set RUN_GMAIL_TESTS=true to run live Gmail SMTP verification';
  }

  if (!process.env.MAIL_USER || !process.env.MAIL_PASS || !process.env.MAIL_TEST_TO) {
    return 'MAIL_USER, MAIL_PASS, and MAIL_TEST_TO are required for live Gmail verification';
  }

  return false;
}
