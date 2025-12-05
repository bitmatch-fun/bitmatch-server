// rooms/fps-room.js
import { Room } from "colyseus";
import { FpsState, Player } from "../schema/fps-state.js";
import RAPIER from "@dimforge/rapier3d-compat";
import { loadGLBMesh } from "../helpers/load-glb-mesh.js";
import { onMove } from "../on-message/on-move.js";
import { onShoot } from "../on-message/on-shoot.js";
import { onMelee } from "../on-message/on-melee.js";

const COLLIDER_SOURCE = "glb";
const SUPABASE_GLB_URL =
  "https://djrsciysnwpranhjkonf.supabase.co/storage/v1/object/public/assets/level_blockout.glb";

const MAP_OFFSET = { x: 0, y: 0, z: 0 };
const MAP_ROT_Y = Math.PI;

export class FpsRoom extends Room {
  async onCreate(options) {

    this.patchRate = 67; // FPS = ~15 updates per second

    console.log("---------------------------------------");
    console.log(
      `⚡ FpsRoom CREATED (${COLLIDER_SOURCE.toUpperCase()} TRIMESH) roomId=${this.roomId}`
    );

    this.maxClients = 10;
    this.setState(new FpsState());

    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0.0, y: 0, z: 0.0 });
    this.playerBodies = new Map();
    this.arenaReady = false;

    this.onMessage("ping", (client) => {
      client.send("pong");
    });

    // 🔥 IMPORTANT: don't block room creation on GLB download
    this.loadArena()
      .then(() => {
        this.arenaReady = true;
        console.log(`✅ Arena ready (roomId=${this.roomId})`);
      })
      .catch((err) => {
        console.error("❌ Arena Load Error:", err);
      });
    // Movement
    this.onMessage("move", (client, data) => {
      onMove(this, client, data);
    });

    this.setSimulationInterval((dt) => this.update(dt), 1000); // 1Hz logic

    // Shooting
    this.onMessage("shoot", (client, data) => {
      onShoot(this, client, data);
    });

    // Melee
    this.onMessage("melee", (client, data) => {
      onMelee(this, client, data);
    });


    this.onMessage("crouch", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const isCrouching = !!data?.isCrouching; // force boolean
      player.isCrouching = isCrouching;

      // (Optional) log to be sure it's working
      // console.log(`[crouch] ${player.username} isCrouching=${player.isCrouching}`);
    });
  }

  update(dt) {
    this.world.step();
  }

  async loadArena() {
    try {
      console.log(
        "Loading mesh for server colliders",
        SUPABASE_GLB_URL
      );

      const { positions, indices } = await loadGLBMesh(SUPABASE_GLB_URL);

      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
        MAP_OFFSET.x,
        MAP_OFFSET.y,
        MAP_OFFSET.z
      );
      const body = this.world.createRigidBody(bodyDesc);

      const colliderDesc = RAPIER.ColliderDesc.trimesh(positions, indices);
      this.world.createCollider(colliderDesc, body);

      console.log(
        `✅ Trimesh collider created on server from ${COLLIDER_SOURCE.toUpperCase()}!`
      );
      console.log("📍 MAP_OFFSET used:", MAP_OFFSET);
      console.log("📍 MAP_ROT_Y used:", MAP_ROT_Y);
      console.log("📏 Player spawn (server):", { x: 0, y: 27, z: 0 });
    } catch (err) {
      console.error("❌ Arena Load Error:", err);
      throw err;
    }
  }

  onJoin(client, options) {
    console.log(`👉 [onJoin] ${client.sessionId} in roomId=${this.roomId}`);

    const p = new Player();
    p.id = client.sessionId;
    p.username = String(options?.username ?? "Guest").slice(0, 32);
    p.avatarUrl = String(options?.avatarUrl ?? "").slice(0, 256);
    p.x = 0;
    p.y = 27;
    p.z = 0;
    p.health = 100;

    console.log('player username: ', p.username);
    console.log('player avatarUrl: ', p.avatarUrl);

    this.state.players.set(client.sessionId, p);

    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        p.x,
        p.y,
        p.z
      )
    );
    const height = 1.8;
    const radius = 0.30;
    const half = Math.max(0, (height - 2 * radius) / 2);

    this.world.createCollider(
      RAPIER.ColliderDesc.capsule(half, radius),
      body
    );
    this.playerBodies.set(client.sessionId, body);
  }

  onLeave(client) {
    console.log(`👋 [onLeave] ${client.sessionId} in roomId=${this.roomId}`);

    this.state.players.delete(client.sessionId);

    const body = this.playerBodies.get(client.sessionId);
    if (body) {
      this.world.removeRigidBody(body);
      this.playerBodies.delete(client.sessionId);
    }
  }
}