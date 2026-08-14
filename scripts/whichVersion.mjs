// Which code is actually live in a Supabase project?
//
//   node scripts/whichVersion.mjs <project-url> <publishable-key>
//
// Deliberately talks to Supabase directly, with no app, no build and no browser
// in between. When the app says every function is stale and you are certain you
// redeployed, the useful question is no longer "is the app right" but "what does
// that project actually return", and this answers it in one round trip per
// function.
//
// It sends an empty body on purpose. Every current function rejects that with a
// 400 that still carries its version, so this costs nothing and needs no API key
// for any model.

const EXPECTED = 2;
const FUNCTIONS = ['generate-proposal', 'generate-outreach', 'list-models'];

const [, , rawUrl, key] = process.argv;

if (!rawUrl || !key) {
  console.error('Usage: node scripts/whichVersion.mjs <project-url> <publishable-key>');
  console.error('Both are in Settings, or in Supabase under Project Settings then API Keys.');
  process.exit(1);
}

const url = rawUrl.trim().replace(/\/+$/, '');
console.log(`\nProject: ${url}\nThis build expects version ${EXPECTED}.\n`);

let stale = 0;
let templated = 0;

for (const name of FUNCTIONS) {
  const label = name.padEnd(19);
  try {
    const res = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }

    const version = body && typeof body === 'object' ? Number(body.__contract) : NaN;

    if (res.status === 404) {
      console.log(`${label} NOT DEPLOYED to this project.`);
      stale++;
    } else if (Number.isFinite(version) && version >= EXPECTED) {
      console.log(`${label} version ${version}. Up to date.`);
    } else if (Number.isFinite(version)) {
      console.log(`${label} version ${version}. Older than this build. Redeploy it.`);
      stale++;
    } else if (res.status === 401) {
      // Our own 401 is stamped; an unstamped one came from the platform, which
      // means the request never reached the function.
      console.log(`${label} was blocked before it ran (401, no version). Turn OFF "Verify JWT" on it.`);
      stale++;
    } else if (/"message"\s*:\s*"Hello/.test(text)) {
      // Supabase's scaffold. The function exists, in the right project, and
      // still runs the starter index.ts, which is what you get when the code is
      // pasted into a NEW file beside index.ts rather than replacing it.
      console.log(`${label} is still Supabase's HELLO WORLD TEMPLATE.`);
      templated++;
      stale++;
    } else {
      console.log(`${label} answered ${res.status} with no version. It predates the version marker.`);
      console.log(`${' '.repeat(20)}It replied: ${text.slice(0, 120)}`);
      stale++;
    }
  } catch (err) {
    console.log(`${label} unreachable: ${err instanceof Error ? err.message : err}`);
    stale++;
  }
}

if (templated) {
  const ref = url.replace(/^https?:\/\//, '').split('.')[0];
  console.log(
    [
      '',
      `${templated} of ${FUNCTIONS.length} still run Supabase's default template.`,
      '',
      'The entrypoint is index.ts. Adding a new file beside it changes nothing, because',
      'index.ts is still what runs. You have to REPLACE everything inside index.ts and',
      'then press Deploy.',
      '',
      'Or skip the editor entirely and deploy from your local files:',
      '',
      '  npx supabase login',
      `  npx supabase link --project-ref ${ref}`,
      '  npm run setup',
      '',
    ].join('\n'),
  );
} else if (stale) {
  console.log(
    `\n${stale} of ${FUNCTIONS.length} need attention.\n` +
      'If you are certain you deployed, check that the project above is the SAME project you deployed to.\n' +
      'That is the usual cause when every function reports stale at once: the deploy landed somewhere else.\n' +
      'Deploy to this one with:  npx supabase link --project-ref <ref>  then  npm run setup\n',
  );
} else {
  console.log('\nAll three are current. If generation still fails, it is not the deployment.\n');
}
