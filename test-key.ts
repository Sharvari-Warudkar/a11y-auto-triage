import 'dotenv/config';

const key = process.env.GEMINI_API_KEY;
console.log(`Testing key: ${key?.slice(0, 5)}...${key?.slice(-4)}`);

async function testKey() {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say hello in one word' }] }]
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error(`FAILED: ${response.status}`);
    console.error(err);
    console.log('\n--- Your key is invalid. Create a new one: ---');
    console.log('1. Go to https://aistudio.google.com/apikey');
    console.log('2. Click "Create API key in new project"');
    console.log('3. New key should start with AIzaSy...');
  } else {
    const data = (await response.json()) as any;
    console.log('SUCCESS! Key works.');
    console.log('Response:', data.candidates[0].content.parts[0].text);
  }
}

testKey();
