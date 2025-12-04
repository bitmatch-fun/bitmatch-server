// combat-helpers/handle-damage.js
import { respawnPlayer } from "./respawn-player.js";

const REGEN_DELAY_MS = 5000; // 5 seconds without damage = full heal

export function handleDamage(room, victim, attacker, amount) {
  if (!victim || !attacker) return;

  // --- Apply damage ---
  victim.health -= amount;

  // --- Hit confirm to attacker ---
  const attackerClient = room.clients.find(
    (c) => c.sessionId === attacker.id
  );

  if (attackerClient) {
    attackerClient.send("hitConfirm", {
      damage: amount,
      killed: victim.health <= 0,
    });
  }

  // --- If victim died ---
  if (victim.health <= 0) {
    victim.health = 0;
    victim.deaths += 1;
    attacker.kills += 1;

    // stop any pending regen (he's dead now)
    if (victim._regenTimeout) {
      victim._regenTimeout.clear(); // 👈 this is the correct way
      victim._regenTimeout = null;
    }

    room.broadcast("kill-feed", {
      killer: attacker.username,
      victim: victim.username,
    });

    const victimClient = room.clients.find(
      (c) => c.sessionId === victim.id
    );

    if (victimClient) {
      victimClient.send("you-died", {
        killerId: attacker.id,
        killerName: attacker.username,
      });
    }

    room.clock.setTimeout(() => respawnPlayer(room, victim), 8000);
    return;
  }

  // --- Still alive: schedule health regen ---
  // If there is already a timer, clear it (he got hit again)
  if (victim._regenTimeout) {
    victim._regenTimeout.clear(); // 👈 instead of room.clock.clearTimeout(...)
    victim._regenTimeout = null;
  }

  victim._regenTimeout = room.clock.setTimeout(() => {
    // Safety: maybe he died before timer fired
    if (!victim || victim.health <= 0) return;

    // Simple: snap back to full health
    victim.health = 100;

    // Clear handle
    victim._regenTimeout = null;
  }, REGEN_DELAY_MS);
}