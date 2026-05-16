import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanPdfText, generateWorkshopSummary } from '../src/services/ai';

test('cleanPdfText removes null bytes and normalizes PDF extraction whitespace', () => {
  assert.equal(
    cleanPdfText('  Workshop\u0000 intro\n\n  with\tmessy   spacing.  '),
    'Workshop intro with messy spacing.'
  );
});

test('AI summary sends cleaned PDF text to the model and returns model output', async () => {
  let prompt = '';

  const summary = await generateWorkshopSummary(Buffer.from('pdf bytes'), {
    extractPdfText: async () => '  Career\n\nSkills\tWorkshop\u0000 for   students  ',
    generateContent: async (nextPrompt) => {
      prompt = nextPrompt;
      return 'A concise generated summary.';
    }
  });

  assert.equal(summary, 'A concise generated summary.');
  assert.match(prompt, /Tóm tắt nội dung sau/);
  assert.match(prompt, /Career Skills Workshop for students/);
  assert.doesNotMatch(prompt.split('\n\n').at(-1) ?? '', /\u0000|\n|\t/);
});

test('AI summary returns a safe fallback when PDF extraction or model generation fails', async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const summary = await generateWorkshopSummary(Buffer.from('bad pdf'), {
      extractPdfText: async () => {
        throw new Error('cannot parse pdf');
      },
      generateContent: async () => 'unused'
    });

    assert.equal(summary, 'Lỗi khi tạo tóm tắt tự động.');
  } finally {
    console.error = originalConsoleError;
  }
});
