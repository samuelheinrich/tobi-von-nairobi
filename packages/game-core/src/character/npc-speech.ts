/** Spoken reactions of non-police NPCs. Pure data plus a deterministic, non-repeating picker. */
export type SpeechTopic =
  | 'flirt'
  | 'flirtRejected'
  | 'bargirlTaunt'
  | 'conductor'
  | 'cellGuard'
  | 'resident'
  | 'yoga'
  | 'tobiCellTaunt';

/** Bar-girl English keeps the affectionate Thai sentence particles «na» and «ka». */
const lines: Record<SpeechTopic, readonly string[]> = {
  flirt: [
    'Hey sexy!',
    'Handsome man!',
    'You come sit with me na?',
    'Ooooh, you have nice hair, ka!',
    'Where you from, handsome man?',
    'You buy me one drink na?',
    'You very funny man, ka!',
    'Handsome man, you dance like my uncle!',
  ],
  flirtRejected: [
    'Maybe later na?',
    'You talk too much, handsome man!',
    'First you stand straight, ka!',
  ],
  bargirlTaunt: ['Hey! No shouting, ka!', 'You crazy man, go home!', 'Not so loud, handsome man!'],
  conductor: [
    '«Ticket! TICKET!»',
    '«Kein Ticket, kein Wagen eins.»',
    '«Zurück, Herr. Zurück!»',
    '«Sie stehen im Weg. Ich auch.»',
    '«Dieser Wagen ist für Leute mit Plan.»',
  ],
  cellGuard: [
    '«Ruhe da drin!»',
    '«Noch einmal und das Licht bleibt aus.»',
    '«Erst ausnüchtern, dann reden wir.»',
    '«Karl kennt hier niemand.»',
  ],
  resident: [
    '«Namasteee.»',
    '«Der Abwasch macht sich nicht selber.»',
    '«Willst du auch Tee?»',
    '«Schuhe aus, bitte.»',
  ],
  yoga: ['«Und einatmen …»', '«Bitte leise, wir atmen gerade.»', '«Finde deine Mitte, Tobi.»'],
  tobiCellTaunt: [
    '«ICH KENNE KARL!»',
    '«DAS IST EIN MISSVERSTÄNDNIS!»',
    '«ICH WILL MEINEN ANRUF!»',
    '«DIE FLASCHEN WAREN SCHON LEER!»',
  ],
};

export function speechOptions(topic: SpeechTopic): readonly string[] {
  return lines[topic];
}

/** Each speaker walks its own list, so repeated interaction produces a conversation, not an echo. */
export class NpcVoices {
  private readonly spoken = new Map<string, number>();
  public next(topic: SpeechTopic, speakerId: string | number): string {
    const key = `${topic}:${speakerId}`;
    const options = lines[topic];
    // Numeric speakers start at a different line, so a row of NPCs does not greet in unison.
    const seed = Number(speakerId);
    const start = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) % options.length : 0;
    const index = this.spoken.get(key) ?? start;
    this.spoken.set(key, index + 1);
    return options[index % options.length]!;
  }
  public reset(): void {
    this.spoken.clear();
  }
}
