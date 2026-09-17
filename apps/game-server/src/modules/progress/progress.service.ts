import { Inject } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Completion, RunResponse, Receipt } from '@tobi/contracts';
import {
  playableLevels,
  contentVersion,
  prototypeBalance,
  pursuitBalance,
  movement,
} from '@tobi/game-data';
import { DatabaseService } from '../../platform/database.service.js';

const publicRun = (run: {
  id: string;
  levelId: string;
  contentVersion: string;
  status: string;
}): RunResponse => ({
  id: run.id,
  levelId: run.levelId,
  contentVersion: run.contentVersion,
  status: run.status as RunResponse['status'],
});

/** Stores bounded, client-reported campaign progress. These are not verified competitive highscores. */
@Injectable()
export class ProgressService {
  public constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  public async read(userId: string) {
    const save = await this.database.client.saveGame.upsert({
      where: { userId_slot: { userId, slot: 1 } },
      create: { userId, slot: 1, currentLevel: 'welcome_to_bali_prototype' },
      update: {},
      include: {
        levels: { orderBy: { levelId: 'asc' } },
        runs: { where: { status: 'active' }, take: 1 },
      },
    });
    return {
      saveId: save.id,
      revision: save.revision,
      score: save.score,
      levels: save.levels.map((l) => ({
        levelId: l.levelId,
        bestScore: l.bestScore,
        bestTimeMs: l.bestTimeMs,
        completions: l.completions,
      })),
      activeRun: save.runs[0] ? publicRun(save.runs[0]) : null,
    };
  }
  public async start(userId: string, requestId: string, levelId: string): Promise<RunResponse> {
    if (!playableLevels.some((l) => l.id === levelId))
      throw new UnprocessableEntityException('Level unbekannt.');
    const save = await this.database.client.saveGame.upsert({
      where: { userId_slot: { userId, slot: 1 } },
      create: { userId, slot: 1 },
      update: {},
    });
    return this.database.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM save_games WHERE id = ${save.id}::uuid FOR UPDATE`;
      const existing = await tx.gameRun.findUnique({
        where: { userId_requestId: { userId, requestId } },
      });
      if (existing) {
        if (existing.levelId !== levelId)
          throw new ConflictException('Anfrage-ID bereits verwendet.');
        return publicRun(existing);
      }
      if (await tx.gameRun.findFirst({ where: { saveId: save.id, status: 'active' } }))
        throw new ConflictException('Ein Versuch ist noch aktiv. Bitte zuerst verwerfen.');
      return publicRun(
        await tx.gameRun.create({
          data: { userId, saveId: save.id, requestId, levelId, contentVersion },
        }),
      );
    });
  }
  public async abandon(userId: string, id: string): Promise<void> {
    const result = await this.database.client.gameRun.updateMany({
      where: { id, userId, status: 'active' },
      data: { status: 'abandoned', finishedAt: new Date() },
    });
    if (
      !result.count &&
      !(await this.database.client.gameRun.findFirst({
        where: { id, userId, status: 'abandoned' },
      }))
    )
      throw new NotFoundException('Aktiver Versuch nicht gefunden.');
  }
  public async complete(userId: string, id: string, completion: Completion): Promise<Receipt> {
    const canonical = { ...completion, pickupIds: [...completion.pickupIds].sort() };
    const digest = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
    return this.database.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM game_runs WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
      const run = await tx.gameRun.findFirst({ where: { id, userId } });
      if (!run) throw new NotFoundException('Versuch nicht gefunden.');
      if (run.status === 'completed') {
        if (run.resultDigest !== digest || run.score === null || run.elapsedMs === null)
          throw new ConflictException('Anderes Ergebnis bereits gespeichert.');
        return { runId: id, score: run.score, elapsedMs: run.elapsedMs };
      }
      if (run.status !== 'active' || run.contentVersion !== contentVersion)
        throw new ConflictException('Versuch kann nicht mehr abgeschlossen werden.');
      const level = playableLevels.find((l) => l.id === run.levelId);
      if (!level) throw new UnprocessableEntityException('Level nicht verfügbar.');
      const ids = new Set(completion.pickupIds);
      // The fastest honest run is the walk from the spawn to the destination at a sprint. When the
      // player is carried there — Fly High ends at an airport 1.5 km away — that distance says
      // nothing about how long the run took, so the walkable area is the measure instead. Without
      // it, every Fly High result was rejected as implausibly fast.
      const bounds = level.navigationBounds;
      const distance = level.destination.carried
        ? bounds
          ? Math.hypot(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ)
          : 0
        : Math.hypot(
            level.destination.position.x - level.spawn.x,
            level.destination.position.z - level.spawn.z,
          );
      const minMs = Math.floor((distance / movement.sprintSpeed) * 1000);
      if (
        completion.debugUsed ||
        ids.size !== completion.pickupIds.length ||
        ids.size !== level.pickups.length ||
        level.pickups.some((p) => !ids.has(p.id)) ||
        completion.elapsedMs < minMs ||
        completion.elapsedMs > Date.now() - run.startedAt.getTime() + 2000 ||
        (level.maxWanted > 0
          ? completion.escapes < 1 ||
            completion.elapsedMs < completion.escapes * pursuitBalance.escapeDuration * 1000
          : completion.escapes !== 0)
      )
        throw new UnprocessableEntityException(
          'Das Ergebnis ist nicht plausibel oder stammt aus einem Debug-Durchlauf.',
        );
      const score =
        ids.size * prototypeBalance.bottlePoints +
        prototypeBalance.completionBonus +
        completion.escapes * pursuitBalance.escapeBonus;
      await tx.$queryRaw`SELECT id FROM save_games WHERE id = ${run.saveId}::uuid FOR UPDATE`;
      const prior = await tx.levelProgress.findUnique({
        where: { saveId_levelId: { saveId: run.saveId, levelId: run.levelId } },
      });
      await tx.levelProgress.upsert({
        where: { saveId_levelId: { saveId: run.saveId, levelId: run.levelId } },
        create: {
          saveId: run.saveId,
          levelId: run.levelId,
          bestScore: score,
          bestTimeMs: completion.elapsedMs,
        },
        update: {
          bestScore: Math.max(prior?.bestScore ?? 0, score),
          bestTimeMs: Math.min(prior?.bestTimeMs ?? Infinity, completion.elapsedMs),
          completions: { increment: 1 },
        },
      });
      await tx.saveGame.update({
        where: { id: run.saveId },
        data: {
          score: { increment: score },
          revision: { increment: 1 },
          currentWorld: level.worldId,
          currentLevel: level.id,
        },
      });
      await tx.gameRun.update({
        where: { id },
        data: {
          status: 'completed',
          score,
          elapsedMs: completion.elapsedMs,
          resultDigest: digest,
          finishedAt: new Date(),
        },
      });
      return { runId: id, score, elapsedMs: completion.elapsedMs };
    });
  }
}
