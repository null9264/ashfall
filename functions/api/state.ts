import { getState } from '../lib/db';
import { viewState } from '../lib/view';
import { json } from '../lib/util';

export async function onRequestGet(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  return json(viewState(s));
}
