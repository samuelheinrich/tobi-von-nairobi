import { EngineStore } from '@babylonjs/core/Engines/engineStore.js';
/** Read-only dev-page probe; never imported by the production client. */
export function characterProbe() {
  const scene = EngineStore.LastCreatedScene;
  const avatar = scene?.transformNodes.find(
    (n) => ['tobi-animated', 'tobi-drunk-animated'].includes(n.name) && n.isEnabled(),
  );
  const prop = scene?.transformNodes.find(
    (n) => n.name === 'tobi-held-bottle' && n.parent !== null,
  );
  return {
    avatar: avatar?.name ?? null,
    position: avatar?.getAbsolutePosition().asArray(),
    joints: avatar
      ?.getChildTransformNodes()
      .filter((n) => ['Hips', 'Head', 'RightFoot'].includes(n.name))
      .map((n) => ({
        name: n.name,
        local: n.position.asArray(),
        world: n.getAbsolutePosition().asArray(),
      })),
    meshes: avatar?.getChildMeshes().map((m) => ({
      name: m.name,
      enabled: m.isEnabled(),
      visible: m.isVisible,
      vertices: m.getTotalVertices(),
    })),
    handParent: prop?.parent?.name ?? null,
    attached: prop?.isEnabled() ?? false,
    finite:
      avatar?.getChildTransformNodes().every((n) => n.position.asArray().every(Number.isFinite)) ??
      false,
    projectiles:
      scene?.transformNodes.filter((n) => !n.parent && n.name === 'tobi-held-bottle').length ?? 0,
  };
}
