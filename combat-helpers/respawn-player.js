// combat-helpers/respawn-player.js

export function respawnPlayer(room, player) {
  if (!room.state.players.has(player.id)) return;

  player.health = 100;
  player.x = 0;
  player.y = 27;
  player.z = 0;

  const body = room.playerBodies.get(player.id);
  if (body) {
    body.setTranslation({ x: 0, y: 27, z: 0 }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }
}