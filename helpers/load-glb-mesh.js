// 
import { NodeIO } from "@gltf-transform/core";

const io = new NodeIO();
const MAP_OFFSET = { x: 0, y: 0, z: 0 };
const MAP_ROT_Y = Math.PI;

export async function loadGLBMesh(meshUrl) {
    if (!meshUrl) console.log('No mesh detected in loadGLBMesh helper');

    console.log('Loading mesh for server colliders', meshUrl);

    let doc;

    const res = await fetch(meshUrl);
    if (!res.ok) {
        throw new Error('Failed to doenload GLB', res.status, res.statusText);
    }

    const arrayBuffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    doc = await io.readBinary(uint8);

    const root = doc.getRoot();
    const scenes = root.listScenes();
    const scene = scenes[0];

    if (!scene) {
        throw new Error("No scene found in GLB");
    }

    const positions = [];
    const indices = [];
    let indexOffset = 0;

    const cosY = Math.cos(MAP_ROT_Y);
    const sinY = Math.sin(MAP_ROT_Y);

    scene.traverse((node) => {
        const mesh = node.getMesh();
        if (!mesh) return;

        const worldMatrix = node.getWorldMatrix();

        for (const prim of mesh.listPrimitives()) {
            const posAttr = prim.getAttribute("POSITION");
            if (!posAttr) continue;

            const idxAttr = prim.getIndices();
            const posArray = posAttr.getArray();
            const idxArray = idxAttr ? idxAttr.getArray() : null;

            const vertCount = posAttr.getCount();

            for (let i = 0; i < vertCount; i++) {
                const x = posArray[i * 3 + 0];
                const y = posArray[i * 3 + 1];
                const z = posArray[i * 3 + 2];

                const m = worldMatrix;

                // GLB → world-space (right-handed)
                let wx = m[0] * x + m[4] * y + m[8] * z + m[12];
                let wy = m[1] * x + m[5] * y + m[9] * z + m[13];
                let wz = m[2] * x + m[6] * y + m[10] * z + m[14];

                // GLB → Babylon: flip Z (right-handed → left-handed)
                wz = -wz;

                // Rotate around Y (bird's-eye)
                if (MAP_ROT_Y !== 0) {
                    const rx = wx * cosY - wz * sinY;
                    const rz = wx * sinY + wz * cosY;
                    wx = rx;
                    wz = rz;
                }

                // NOTE: MAP_OFFSET is applied later via body translation,
                // so we DON'T add it here. Keep vertices centered.
                positions.push(wx, wy, wz);
            }

            if (idxArray) {
                for (let i = 0; i < idxArray.length; i++) {
                    indices.push(idxArray[i] + indexOffset);
                }
            } else {
                for (let i = 0; i < vertCount; i++) {
                    indices.push(i + indexOffset);
                }
            }

            indexOffset += vertCount;
        }
    });

    if (positions.length === 0 || indices.length === 0) {
        throw new Error("GLB collider: no positions/indices found");
    }

    const pos32 = new Float32Array(positions);
    const idx32 = new Uint32Array(indices);

    console.log("✅ GLB mesh stats:", {
        verts: pos32.length / 3,
        tris: idx32.length / 3,
    });

    // Debug bounds (already Z-flipped + rotated)
    let minX = Infinity,
        minY = Infinity,
        minZ = Infinity;
    let maxX = -Infinity,
        maxY = -Infinity,
        maxZ = -Infinity;

    for (let i = 0; i < pos32.length; i += 3) {
        const x = pos32[i];
        const y = pos32[i + 1];
        const z = pos32[i + 2];

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;

        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
    }

    console.log("📦 GLB bounds (AFTER Z-FLIP + ROT Y, before MAP_OFFSET):", {
        minX,
        minY,
        minZ,
        maxX,
        maxY,
        maxZ,
    });

    return { positions: pos32, indices: idx32 };

}