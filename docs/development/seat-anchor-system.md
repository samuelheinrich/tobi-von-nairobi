# Seat anchors

The seating runtime treats a seat as authored character geometry rather than an offset from a
furniture centre. `SeatSurface` describes the solid top face. Its child `SeatAnchor` is the desired
world pose of the animated pelvis and may optionally carry left/right foot targets.

The runtime samples the sitting animation first. It then resolves the configured humanoid `hips`
bone through `SkeletonAdapter` and translates the visual mount by the exact difference between the
sampled pelvis and the anchor. Joe, Josh, Woman, Glanzmann and future humanoids therefore use the
same solve despite different roots, heights and bone namespaces. `bodyMetrics` exposes measured
height and hips-to-foot distance for later foot alignment; it is not a table of character offsets.

For NPCs, the visual mount is parented to the anchor. An anchor parented to a coach, vehicle or
other moving object carries the seated model in local coordinates. The gameplay root remains
available to AI and collision code. Tobi's existing gameplay/camera root remains authoritative;
only his visual body receives the pelvis correction while using a migrated seat.

## Thailand Railway reference migration

Each bench position now owns:

- a solid seat collider with `sittable` and `seatSurface` metadata;
- a surface marker at the top face;
- a pelvis marker facing the aisle;
- two provisional foot targets at floor level.

The first occupied reference group deterministically includes Joe, Josh, Woman and one Glanzmann.
It contains both seating directions. The two player seats reference the same anchor ids. Bench
backs were also moved to the outboard side so their visible geometry agrees with the authored
facing direction.

## Imported sitting clip

| Property | `sitting.glb` |
| --- | --- |
| Gameplay/root motion | ignored |
| Armature wrapper translation | discarded during retarget import |
| Horizontal hips translation | ignored by `ClipSampler` |
| Vertical hips translation | retained and included in the pelvis solve |

The old `CharacterConfig.seatOffset` correction has been removed. `seatHeight` remains only as a
legacy path for levels that have not yet been migrated; `anchoredSeat` explicitly bypasses that
path. Do not add character-specific centimetre corrections to the new system.

## Next phases

After the Thailand Railway reference has been visually accepted, the next work is the Model Studio
seat/debug view, optional foot correction, moving-seat verification, and gradual migration of the
aircraft, station, bars, benches and vehicles.
