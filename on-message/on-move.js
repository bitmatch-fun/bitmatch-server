// colyseus-server/on-message/on-move.js

export function onMove(room, client, data) {
  const p = room.state.players.get(client.sessionId);
  if (!p || p.health <= 0) return;

  p.x = data.x;
  p.y = data.y;
  p.z = data.z;
  p.ry = data.ry;

  const body = room.playerBodies.get(client.sessionId);
  if (body) {
    body.setTranslation({ x: p.x, y: p.y, z: p.z }, true);
  }
}