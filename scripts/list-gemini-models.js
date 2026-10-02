require('dotenv').config();

(async () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.log('❌ GEMINI_API_KEY not set');
    process.exit(1);
  }

  console.log('\n📋 Fetching available models from Google...\n');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
  );
  const data = await res.json();

  if (!data.models) {
    console.log('❌ Unexpected response:');
    console.log(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`Found ${data.models.length} models.\n`);
  console.log('Models that support generateContent (usable for chat):\n');

  const usable = data.models.filter((m) =>
    (m.supportedGenerationMethods || []).includes('generateContent')
  );

  for (const m of usable) {
    const name = m.name.replace('models/', '');
    console.log(`   ✅ ${name}`);
    console.log(`      Display:  ${m.displayName || '(no display name)'}`);
    console.log(`      Desc:     ${(m.description || '').slice(0, 100)}`);
    console.log('');
  }

  console.log('\nModels that support embedContent (usable for embeddings):\n');

  const embeddable = data.models.filter((m) =>
    (m.supportedGenerationMethods || []).includes('embedContent')
  );

  for (const m of embeddable) {
    const name = m.name.replace('models/', '');
    console.log(`   ✅ ${name}`);
  }

  if (embeddable.length === 0) {
    console.log('   (none — embeddings will run in keyword fallback mode)');
  }

  console.log('');
  process.exit(0);
})();