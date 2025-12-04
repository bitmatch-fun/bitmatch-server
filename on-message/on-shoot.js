// on-message/on-shoot.js
import RAPIER from "@dimforge/rapier3d-compat";
import { handleDamage } from "../combat-helpers/handle-damage.js";

export function onShoot(room, client, data) {
  const shooter = room.state.players.get(client.sessionId);
  if (!shooter || shooter.health <= 0) return;

  room.broadcast("player-shot", {
    sessionId: client.sessionId,
    origin: data.origin,       // { x, y, z }
    direction: data.direction, // { x, y, z }
  });

  const shooterBody = room.playerBodies.get(client.sessionId);
  if (!shooterBody) return;

  let { origin, direction } = data;

  const len = Math.hypot(direction.x, direction.y, direction.z) || 1;
  direction = {
    x: direction.x / len,
    y: direction.y / len,
    z: direction.z / len,
  };

  console.log(
    `🔫 shoot origin=${JSON.stringify(origin)} dir=${JSON.stringify(
      direction
    )}`
  );

  const ray = new RAPIER.Ray(origin, direction);

  const hit = room.world.castRay(
    ray,
    1000,
    true,
    undefined,
    undefined,
    (collider) => {
      const parent = collider.parent();
      if (!parent) return true;
      return parent.handle !== shooterBody.handle;
    }
  );

  if (!hit) {
    console.log("💨 RAY MISSED EVERYTHING");
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

  console.log("Ray hit:", {
    toi,
    impactPoint,
    targetId,
  });

  if (targetId && targetId !== client.sessionId) {
    const target = room.state.players.get(targetId);
    if (target && target.health > 0) {
      console.log(`🎯 Hit ${target.username}`);
      handleDamage(room, target, shooter, 15);

      // 🔥 NEW: send private "got-hit" message to the victim
      const targetBody = room.playerBodies.get(targetId);
      if (targetBody) {
        const shooterPos = shooterBody.translation();
        const targetPos = targetBody.translation();

        const victimClient = room.clients.find(
          (c) => c.sessionId === targetId
        );

        if (victimClient) {
          victimClient.send("got-hit", {
            shooterPos: {
              x: shooterPos.x,
              y: shooterPos.y,
              z: shooterPos.z,
            }
          });
        }
      }
    } else {
      console.log("Hit dead/missing player");
    }
  } else {
    console.log("🧱 Hit static geometry (wall/floor)");
  }
}