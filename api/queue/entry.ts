export const config = { runtime: 'edge' };

import { sql } from '@vercel/postgres';

export default async function handler(req: Request) {
  // artificial latency (anti-bot)
  await new Promise(r => setTimeout(r, 800 + Math.random() * 400));

  // получаем wallet
  const wallet = req.headers.get('x-wallet');

  // всегда отвечаем одинаково
  if (!wallet) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // получаем активную очередь (только одну)
  const { rows: queueRows } = await sql`
    SELECT id, state
    FROM queues
    WHERE state = 'entry'
    LIMIT 1
  `;

  // если нет активного окна входа — тихо выходим
  if (queueRows.length === 0) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const queueId = queueRows[0].id;

  // проверяем: уже есть запись этого wallet в этой очереди
  const { rowCount } = await sql`
    SELECT 1
    FROM queue_entries
    WHERE queue_id = ${queueId}
      AND wallet = ${wallet}
    LIMIT 1
  `;

  // если уже есть — ничего не делаем
  if (rowCount > 0) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // создаём новую запись (один шанс)
  await sql`
    INSERT INTO queue_entries (
      queue_id,
      wallet,
      status
    )
    VALUES (
      ${queueId},
      ${wallet},
      'pending'
    )
  `;

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
