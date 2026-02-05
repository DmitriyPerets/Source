export const config = { runtime: 'edge' };

import { sql } from '@vercel/postgres';

export default async function handler(req: Request) {
  // 🔐 admin protection
  const secret = req.headers.get('x-admin-secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return new Response('Forbidden', { status: 403 });
  }

  // параметры (можно менять)
  const BATCH_SIZE = 100;

  // 1. получить активную очередь
  const { rows: queueRows } = await sql`
    SELECT id, state
    FROM queues
    WHERE state = 'entry'
    LIMIT 1
  `;

  if (!queueRows.length) {
    return new Response(JSON.stringify({ error: 'No active entry queue' }), { status: 400 });
  }

  const queueId = queueRows[0].id;

  // 2. выбрать всех pending
  const { rows: entries } = await sql`
    SELECT id
    FROM queue_entries
    WHERE queue_id = ${queueId}
      AND status = 'pending'
  `;

  if (!entries.length) {
    return new Response(JSON.stringify({ error: 'No pending entries' }), { status: 400 });
  }

  // 3. перемешать (Fisher–Yates)
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  // 4. обновить позиции и батчи
  for (let i = 0; i < entries.length; i++) {
    const position = i + 1;
    const batch = Math.ceil(position / BATCH_SIZE);

    await sql`
      UPDATE queue_entries
      SET
        position = ${position},
        batch = ${batch},
        status = 'inactive',
        updated_at = now()
      WHERE id = ${entries[i].id}
    `;
  }

  // 5. обновить очередь
  await sql`
    UPDATE queues
    SET
      state = 'assigned',
      batch_size = ${BATCH_SIZE},
      updated_at = now()
    WHERE id = ${queueId}
  `;

  return new Response(
    JSON.stringify({
      ok: true,
      assigned: entries.length,
      batch_size: BATCH_SIZE,
      total_batches: Math.ceil(entries.length / BATCH_SIZE)
    }),
    { status: 200 }
  );
}
