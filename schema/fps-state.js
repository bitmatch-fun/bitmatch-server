// colyseus-server/schema/fps-state.js
import { Schema, MapSchema, defineTypes } from "@colyseus/schema";

export class Player extends Schema {
  constructor() {
    super();
    this.id = "";
    this.username = "";
    this.avatarUrl = "";   // 👈 NEW
    this.ready = false;
    this.lastPingMs = 0;

    // position
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.ry = 0;

    // crouch state
    this.isCrouching = false;

    // ⚔️ COMBAT STATS
    this.health = 100;
    this.kills = 0;
    this.deaths = 0;
  }
}

export class FpsState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}

defineTypes(Player, {
  id: "string",
  username: "string",
  avatarUrl: "string",   // 👈 NEW

  ready: "boolean",
  lastPingMs: "number",

  x: "number",
  y: "number",
  z: "number",
  ry: "number",

  // crouch
  isCrouching: "boolean",

  // stats
  health: "number",
  kills: "number",
  deaths: "number",
});

defineTypes(FpsState, {
  players: { map: Player },
});