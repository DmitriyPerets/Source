export const config = { runtime:'edge' };
import { sql } from '@vercel/postgres';

export default async (req:Request) => {
  const wallet = req.headers.get('x-wallet');
  if (!wallet) return new Response(JSON.stringify({ ok:true }));

  await sql`
    UPDATE queue_entries
    SET status='completed'
    WHERE wallet=${wallet} AND status='active'
  `;

  return new Response(JSON.stringify({ ok:true }));
};
