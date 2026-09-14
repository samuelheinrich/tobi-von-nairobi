/** Spoken reactions of non-police NPCs, plus Tobi's own shouting. Pure data and a
 * deterministic, non-repeating picker. No engine, no DOM, no randomness the tests cannot replay.
 */
export type SpeechTopic =
  | 'tobiTaunt'
  | 'tobiCellTaunt'
  | 'tobiFlightTaunt'
  | 'crowd'
  | 'crowdAnnoyed'
  | 'flirt'
  | 'flirtRejected'
  | 'bargirlTaunt'
  | 'conductor'
  | 'cellGuard'
  | 'resident'
  | 'yoga'
  | 'passenger'
  | 'barGuest';

/** Bar-girl English keeps the affectionate Thai sentence particles «na» and «ka».
 * German lines are de-CH: «ss» instead of «ß», and the guillemets the rest of the UI uses.
 */
const lines: Record<SpeechTopic, readonly string[]> = {
  /** Tobi shouting at anyone within earshot. The joke is that he is certain this helps. */
  tobiTaunt: [
    '«ICH KENNE KARL!»',
    '«PLATZ DA, ICH KENNE KARL!»',
    '«KARL REGELT DAS!»',
    '«WISST IHR, WER ICH BIN?»',
    '«ICH HAB DAS ALLES IM GRIFF!»',
    '«DAS IST MEIN URLAUB!»',
    '«ICH BIN NUR KURZ HIER!»',
    '«MORGEN BIN ICH IN ABU DHABI!»',
    '«ICH ZAHL DAS SPÄTER!»',
    '«DAS WAR SCHON OFFEN!»',
    '«NICHT MEIN ERSTES MAL!»',
    '«ICH LAUFE ABSOLUT GERADE!»',
    '«WER HAT DAS BESTELLT?»',
    '«ICH RED MIT DEM CHEF!»',
    '«HABT IHR KARL GESEHEN?»',
    '«DAS HIER IST EIN MISSVERSTÄNDNIS!»',
  ],
  /** In the cell the same confidence keeps running, with nobody left to impress. */
  tobiCellTaunt: [
    '«ICH KENNE KARL!»',
    '«DAS IST EIN MISSVERSTÄNDNIS!»',
    '«ICH WILL MEINEN ANRUF!»',
    '«DIE FLASCHEN WAREN SCHON LEER!»',
    '«ICH HAB EIN RÜCKFLUGTICKET!»',
    '«KARL HOLT MICH HIER RAUS!»',
    '«WO IST MEINE SONNENBRILLE?»',
    '«ICH WAR DAS GAR NICHT!»',
    '«GIBT ES HIER FRÜHSTÜCK?»',
    '«ICH BESCHWERE MICH!»',
  ],
  /** Shouting on a plane is a different kind of bad idea. */
  tobiFlightTaunt: [
    '«HALLO? SERVICE?»',
    '«ICH SITZE HIER FALSCH!»',
    '«WO BLEIBT DAS GETRÄNK?»',
    '«ICH KENNE DEN PILOTEN!»',
    '«IST DAS DIE BUSINESS CLASS?»',
    '«NUR EINE FRAGE!»',
  ],
  /** Parade dancers and holiday bystanders shouting back. Cheerful, not hostile. */
  crowd: [
    '«Wer ist Karl?»',
    '«Aaaalso guet!»',
    '«Hoi zäme!»',
    '«Er kennt Karl!»',
    '«Was isch das für en Typ?»',
    '«Tanz doch mit!»',
    '«Chum abe vo de Büni!»',
    '«Jaaa, Karl!»',
    '«Der kennt alle.»',
    '«Kollege, alles guet?»',
    '«Nimm en Schluck Wasser.»',
    '«Sali!»',
    '«Ist das im Line-up?»',
    '«Der hat Energie.»',
  ],
  /** Same crowd, once Tobi has been shouting for a while. */
  crowdAnnoyed: [
    '«Jetzt isch guet.»',
    '«Muesch nöd so schreie!»',
    '«Wir haben dich gehört.»',
    '«Geh doch heim, Kollege.»',
    '«Niemand kennt Karl!»',
    '«Ruhig, ja?»',
  ],
  flirt: [
    'Hey sexy!',
    'Handsome man!',
    'You come sit with me na?',
    'Ooooh, you have nice hair, ka!',
    'Where you from, handsome man?',
    'You buy me one drink na?',
    'You very funny man, ka!',
    'Handsome man, you dance like my uncle!',
    'You strong man! Very strong, ka!',
    'Why you alone na?',
    'Your sunglasses very cool, ka!',
    'You stay long time in Bangkok?',
    'You have nice smile, handsome man!',
    'Come come, I show you good drink na!',
  ],
  flirtRejected: [
    'Maybe later na?',
    'You talk too much, handsome man!',
    'First you stand straight, ka!',
    'You already have many bottle, ka!',
    'My friend like you more na!',
    'Later later, handsome man!',
  ],
  bargirlTaunt: [
    'Hey! No shouting, ka!',
    'You crazy man, go home!',
    'Not so loud, handsome man!',
    'Who is Karl na?',
    'You scare my customer, ka!',
    'Shhh! Music already loud!',
  ],
  conductor: [
    '«Ticket! TICKET!»',
    '«Kein Ticket, kein Wagen eins.»',
    '«Zurück, Herr. Zurück!»',
    '«Sie stehen im Weg. Ich auch.»',
    '«Dieser Wagen ist für Leute mit Plan.»',
    '«Ihre Fahrkarte, bitte. Jetzt.»',
    '«Karl hat hier auch kein Ticket.»',
    '«Setzen Sie sich einfach hin.»',
    '«Ich mache das seit zwanzig Jahren.»',
    '«Der Zug fährt auch ohne Sie vorwärts.»',
  ],
  cellGuard: [
    '«Ruhe da drin!»',
    '«Noch einmal und das Licht bleibt aus.»',
    '«Erst ausnüchtern, dann reden wir.»',
    '«Karl kennt hier niemand.»',
    '«Morgen um acht, nicht früher.»',
    '«Das sagen sie alle.»',
    '«Legen Sie sich einfach hin.»',
    '«Ihr Anruf ist notiert. Morgen.»',
  ],
  resident: [
    '«Namasteee.»',
    '«Der Abwasch macht sich nicht selber.»',
    '«Willst du auch Tee?»',
    '«Schuhe aus, bitte.»',
    '«Wir haben hier einen Putzplan.»',
    '«Das Zimmer ist noch frei.»',
    '«Hast du die Flaschen gezählt?»',
    '«Alles fliesst, Tobi.»',
    '«Magst du Kombucha?»',
    '«Karl hat auch nie abgewaschen.»',
  ],
  yoga: [
    '«Und einatmen …»',
    '«Bitte leise, wir atmen gerade.»',
    '«Finde deine Mitte, Tobi.»',
    '«Sonnengruss, nicht Sondergruss.»',
    '«Atme durch die Nase, nicht durchs Gesicht.»',
    '«Wir halten das noch drei Atemzüge.»',
    '«Dein Becken ist sehr verspannt.»',
  ],
  /** Seated travellers in the train, startled out of a long journey. */
  passenger: [
    '«Ssst!»',
    '«Ich schlafe hier.»',
    '«Noch fünf Stunden …»',
    '«Setz dich doch einfach.»',
    '«Nicht schon wieder einer.»',
    '«Ist das der richtige Zug?»',
  ],
  /** Standing drinkers in the bar carriage and on the Nana stools. */
  barGuest: [
    '«Prost!»',
    '«Noch eins?»',
    '«Der Wagen schwankt, nicht du.»',
    '«Erzähl das dem Schaffner.»',
    '«Wer ist jetzt Karl?»',
    '«Setz dich, Kollege.»',
  ],
};

export function speechOptions(topic: SpeechTopic): readonly string[] {
  return lines[topic];
}

/** Every line the game can speak, for tooling that needs the full set (licence notes, TTS). */
export function allSpeechTopics(): readonly SpeechTopic[] {
  return Object.keys(lines) as SpeechTopic[];
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
