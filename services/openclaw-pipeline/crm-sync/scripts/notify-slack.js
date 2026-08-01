#!/usr/bin/env node
/**
 * crm-sync/notify-slack.js — Send pipeline notifications to Slack.
 *
 * Usage:
 *   node notify-slack.js --title "新規リード送信待ち" --message "企業名: Example Inc..."
 *   node notify-slack.js --title "バッチ完了" --message "50件処理完了" --dry-run
 */

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || 'C0B1JJ1L276';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const val = args[i + 1];
    switch (args[i]) {
      case '--title': opts.title = val; i++; break;
      case '--message': opts.message = val; i++; break;
      case '--channel': opts.channel = val; i++; break;
      case '--dry-run': opts.dryRun = true; break;
    }
  }
  return opts;
}

async function notifySlack({ title, message, channel }) {
  if (!SLACK_BOT_TOKEN) {
    console.warn('SLACK_BOT_TOKEN not set — skipping Slack notification');
    return { sent: false, reason: 'no_token' };
  }

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: title || 'Sales Pipeline Notification' },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: message },
    },
  ];

  const targetChannel = channel || SLACK_CHANNEL_ID;
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: targetChannel,
      blocks,
      text: title,
    }),
    signal: AbortSignal.timeout(10000),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
  return { sent: true, channel: targetChannel, ts: data.ts };
}

async function main() {
  const opts = parseArgs();

  if (!opts.title && !opts.message) {
    const input = await readStdin();
    try {
      const parsed = JSON.parse(input);
      opts.title = parsed.title;
      opts.message = parsed.message;
      opts.channel = parsed.channel;
    } catch {
      console.error('Usage: node notify-slack.js --title "TITLE" --message "BODY"');
      process.exit(1);
    }
  }

  if (opts.dryRun) {
    console.log('[DRY RUN] Would send to Slack:');
    console.log(`  Channel: ${opts.channel || SLACK_CHANNEL_ID}`);
    console.log(`  Title: ${opts.title}`);
    console.log(`  Message: ${opts.message}`);
    return;
  }

  console.log(`Sending to Slack #${opts.channel || SLACK_CHANNEL_ID}...`);
  const result = await notifySlack(opts);
  console.log('Sent:', JSON.stringify(result));
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
    process.stdin.setEncoding('utf8');
  });
}

module.exports = { notifySlack };

if (require.main === module) {
  main().catch(err => {
    console.error('Notify failed:', err.message);
    process.exit(1);
  });
}
