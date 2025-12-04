// on-message/on-melee.js
import RAPIER from "@dimforge/rapier3d-compat";
import { handleDamage } from "../combat-helpers/handle-damage.js";

export function onMelee(room, client, data) {
  const attacker = room.state.players.get(client.sessionId);
  if (!attacker || attacker.health <= 0) return;

  const attackerBody = room.playerBodies.get(client.sessionId);
  if (!attackerBody) return;

  if (!data || !data.origin || !data.direction) return;

  // ✅ Only trust origin + direction from client
  let { origin, direction } = data;

  // Normalize direction
  const len = Math.hypot(direction.x, direction.y, direction.z) || 1;
  direction = {
    x: direction.x / len,
    y: direction.y / len,
    z: direction.z / len,
  };

  // ✅ Server-authoritative melee range (2 meters, hard-coded)
  const meleeRange = 2;

  console.log(
    `🗡 melee origin=${JSON.stringify(origin)} dir=${JSON.stringify(
      direction
    )} range=${meleeRange}`
  );

  const ray = new RAPIER.Ray(origin, direction);

  const hit = room.world.castRay(
    ray,
    meleeRange,
    true,
    undefined,
    undefined,
    (collider) => {
      const parent = collider.parent();
      if (!parent) return true;
      // ignore own capsule
      return parent.handle !== attackerBody.handle;
    }
  );

  if (!hit) {
    console.log("💨 MELEE MISSED");
    return;
  }

  const collider = hit.collider;
  const parentBody = collider.parent();

  let targetId = null;
  if (parentBody) {
    for (const [sid, body] of room.playerBodies.entries()) {
      if (body.handle === parentBody.handle) {
        targetId = sid;
        break;
      }
    }
  }

  const toi = hit.toi ?? hit.timeOfImpact;
  const impactPoint = toi != null ? ray.pointAt(toi) : null;

  console.log("Melee ray hit:", {
    toi,
    impactPoint,
    targetId,
  });

  if (targetId && targetId !== client.sessionId) {
    const target = room.state.players.get(targetId);
    if (target && target.health > 0) {
      console.log(`🩸 Melee hit ${target.username}`);
      handleDamage(room, target, attacker, 50); // melee damage here
    } else {
      console.log("Melee hit dead/missing player");
    }
  } else {
    console.log("🧱 Melee hit static geometry or self");
  }
}