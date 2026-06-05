#!/usr/bin/env node
// TrackUp backend setup.
//
// Connects your Supabase project and installs everything the app needs:
//   - database schema (users + jobs tables, RLS, triggers)
//   - the `proposals` storage bucket
//   - the `generate-proposal` Edge Function
//
// Run it with:  npm run setup

import { execSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const color = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const runQuiet = (cmd) => {
  try {
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

const fail = (message) => {
  console.error('\n' + color.red('✖ ' + message) + '\n');
  process.exit(1);
};

const normalizeRef = (value) => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:https?:\/\/)?([a-z0-9]{16,})(?:\.supabase\.co)?\/?$/i);
  return match ? match[1] : trimmed;
};

console.log(color.bold('\n  TrackUp — backend setup\n'));
console.log('  This installs the database schema, the proposals storage bucket,');
console.log('  and the generate-proposal Edge Function on your Supabase project.\n');

const rl = readline.createInterface({ input, output });
const refInput = await rl.question(
  '  Paste your Supabase project URL or ref\n  ' +
    color.dim('e.g. https://abcd1234efgh5678.supabase.co') +
    '\n  > ',
);
rl.close();

const ref = normalizeRef(refInput);
if (!ref) fail('No project ref provided.');
console.log('\n  Using project ref: ' + color.cyan(ref));

// 1. Make sure the Supabase CLI is logged in.
console.log(color.bold('\n  [1/4] Checking Supabase login...'));
if (runQuiet('npx supabase projects list')) {
  console.log(color.green('  Already logged in.'));
} else {
  console.log('  Not logged in — starting the login flow.');
  console.log(color.dim('  (Paste the access token from the browser when prompted.)\n'));
  try {
    run('npx supabase login');
  } catch {
    fail('Login failed. Run "npx supabase login" manually, then re-run "npm run setup".');
  }
}

// 2. Link the local repo to the remote project.
console.log(color.bold(`\n  [2/4] Linking project ${ref}...`));
console.log(color.dim('  (Enter the database password you set when creating the project.)\n'));
try {
  run(`npx supabase link --project-ref ${ref}`);
} catch {
  fail('Linking failed. Double-check the project ref and your database password.');
}

// 3. Apply the schema + storage bucket migrations.
console.log(color.bold('\n  [3/4] Applying database schema + storage bucket...'));
try {
  run('npx supabase db push');
} catch {
  fail('Applying migrations failed. See the error above.');
}

// 4. Deploy the Edge Functions with JWT verification off. New Supabase projects
// enforce the new API-key system, whose gateway rejects the legacy JWT check —
// so the functions must be deployed with --no-verify-jwt or every call 401s.
console.log(color.bold('\n  [4/4] Deploying Edge Functions (JWT verification off)...'));
for (const fn of ['generate-proposal', 'generate-outreach', 'list-models']) {
  console.log('  deploying ' + color.cyan(fn) + '…');
  try {
    run(`npx supabase functions deploy ${fn} --no-verify-jwt`);
  } catch {
    fail(`Deploying ${fn} failed. See the error above.`);
  }
}

console.log(color.green(color.bold('\n  ✓ Backend ready!\n')));
console.log('  Next steps:');
console.log('   1. Deploy the frontend (see SETUP.md), or run ' + color.cyan('npm run dev') + ' locally.');
console.log('   2. Open the app and paste your Supabase URL + anon key on the setup screen.');
console.log('   3. In Settings, add an AI key — a free Google Gemini key works.\n');
