export const config = { runtime: 'edge' };

import { sql } from '@vercel/postgres';

export default async function handler(req: Request) {
  // artificial latency (anti-bot)
  await new Promise(r => setTimeout(r, 800 + Math.random() * 400));

  const wallet = req.headers.get('x-wallet');

  // если кошелька нет — ничего не говорим
  if (!wallet) {
    return new Response(JSON.stringify({}), { status: 200 });
  }

  // получаем статус ТОЛЬКО этого кошелька
  const { rows } = await sql`
    SELECT
      position,
      status
    FROM queue_entries
    WHERE wallet = ${wallet}
    ORDER BY joined_at DESC
    LIMIT 1
  `;

  // если пользователь не в очереди
  if (rows.length === 0) {
    return new Response(JSON.stringify({}), { status: 200 });
  }

  // возвращаем минимально необходимое
  return new Response(
    JSON.stringify({
      position: rows[0].position,
      status: rows[0].status
    }),
    { status: 200 }
  );
}
