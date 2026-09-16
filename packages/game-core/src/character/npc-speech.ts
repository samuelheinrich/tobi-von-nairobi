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
  | 'witch'
  | 'passenger'
  | 'barGuest'
  | 'policeSpotted'
  | 'policeChase'
  | 'policeSearch'
  | 'policeCaught'
  | 'greeting'
  | 'greetingBar'
  | 'greetingYoga'
  | 'greetingTrain'
  | 'nanaSecurity'
  | 'nanaBartender'
  | 'nanaTourist'
  | 'nanaExpat'
  | 'nanaVendor'
  | 'nanaTaxi'
  | 'nanaDrunk';

/** Bar-girl English keeps the affectionate Thai sentence particles «na» and «ka».
 * German lines are de-CH: «ss» instead of «ß», and the guillemets the rest of the UI uses.
 */
const lines: Record<SpeechTopic, readonly string[]> = {
  nanaSecurity: [
    'Please keep the entrance clear.',
    'Easy, sir. People are working here.',
    'No throwing bottles. Last warning.',
    'Calm down or we walk you outside.',
    'The exit is behind you, sir.',
    'One warning is enough, please.',
  ],
  nanaBartender: [
    'Beer, shot or water?',
    'Water might be a good idea.',
    'The menu is at the counter.',
    'Your friend Karl left no deposit.',
    'Cold drinks, warm welcome.',
    'Take your time with the menu.',
  ],
  nanaTourist: [
    'Is the Skytrain still running?',
    'We already walked past this bar.',
    'What a night!',
    'I only came here for noodles.',
    'Have you seen my friends?',
    'We need a photo of those lights.',
  ],
  nanaExpat: [
    'The stairs are at the back.',
    'A quiet drink. That was the plan.',
    'Soi 4 never sleeps.',
    'Try the upstairs show.',
    'Keep your receipt.',
    'Same street, a different night.',
  ],
  nanaVendor: [
    'Fresh noodles, still hot!',
    'Hungry? You look hungry.',
    'Careful, hot wok!',
    'Food first, another drink later.',
    'Fresh mango over here!',
    'Mind the cart, please.',
  ],
  nanaTaxi: [
    'Taxi? Meter on.',
    'Where are you going?',
    'No, Abu Dhabi is not nearby.',
    'I can wait, take your time.',
    'Hotel or station?',
    'Traffic is moving slowly tonight.',
  ],
  nanaDrunk: [
    'Have some water, friend.',
    'The floor is perfectly straight.',
    'Take a seat for a minute.',
    'Your dancing needs a rest.',
    'Perhaps skip the next shot.',
    'Your taxi is that way.',
  ],
  /** Tobi shouting at anyone within earshot. The joke is that he is certain this helps. */
  tobiTaunt: [
    '«ICH KENNE KARL!»',
    '«SO KANN MAN NICHT ARBEITEN!»',
    '«JEEEPPAAAA!»',
    '«JA SPINNSCH?!»',
    '«HALLOOO?!»',
    '«GAHT NO?!»',
    '«DAS GIBT ES DOCH NICHT!»',
    '«ICH FASS ES NICHT!»',
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
    '«ICH BIN IM URLAUB, VERDAMMT!»',
    '«SCHAUT MICH NICHT SO AN!»',
    '«ICH HAB NUR GEFRAGT!»',
    '«DAS IST DOCH NORMAL!»',
    '«BEI UNS MACHT MAN DAS SO!»',
    '«WO IST DAS PROBLEM?!»',
    '«ICH BIN DER RUHIGSTE HIER!»',
    '«JETZT ABER MAL LANGSAM!»',
  ],
  /** In the cell the same confidence keeps running, with nobody left to impress. */
  tobiCellTaunt: [
    '«ICH KENNE KARL!»',
    '«SO KANN MAN NICHT ARBEITEN!»',
    '«JEEEPPAAAA!»',
    '«DAS IST EIN MISSVERSTÄNDNIS!»',
    '«ICH WILL MEINEN ANRUF!»',
    '«DIE FLASCHEN WAREN SCHON LEER!»',
    '«ICH HAB EIN RÜCKFLUGTICKET!»',
    '«KARL HOLT MICH HIER RAUS!»',
    '«WO IST MEINE SONNENBRILLE?»',
    '«ICH WAR DAS GAR NICHT!»',
    '«GIBT ES HIER FRÜHSTÜCK?»',
    '«ICH BESCHWERE MICH!»',
    '«HÖRT MICH JEMAND?!»',
    '«ICH HAB RECHTE!»',
    '«DAS WAR NOTWEHR!»',
    '«EINMAL TELEFONIEREN!»',
  ],
  /** Shouting on a plane is a different kind of bad idea. */
  tobiFlightTaunt: [
    '«HALLO? SERVICE?»',
    '«SO KANN MAN NICHT ARBEITEN!»',
    '«ICH SITZE HIER FALSCH!»',
    '«WO BLEIBT DAS GETRÄNK?»',
    '«ICH KENNE DEN PILOTEN!»',
    '«IST DAS DIE BUSINESS CLASS?»',
    '«MEIN SITZ KLEMMT!»',
    '«NOCH LANGE?»',
    '«DARF ICH MAL DURCH?»',
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
    '«Wer isch dää?»',
    '«Läck du!»',
    '«Hesch es guet?»',
    '«Sicher, sicher.»',
    '«Der meint das ernst.»',
    '«Foto! Foto!»',
    '«Guet gsi!»',
    '«Ist das der von vorhin?»',
    '«Mega Typ.»',
    '«Lass ihn doch.»',
  ],
  /** Same crowd, once Tobi has been shouting for a while. */
  crowdAnnoyed: [
    '«Jetzt isch guet.»',
    '«Muesch nöd so schreie!»',
    '«Wir haben dich gehört.»',
    '«Geh doch heim, Kollege.»',
    '«Niemand kennt Karl!»',
    '«Ruhig, ja?»',
    '«Es reicht jetzt.»',
    '«Immer der Gleiche.»',
    '«Nimm dich zäme.»',
    '«Sag das nochmal, dann …»',
    '«Hör auf zu brüllen.»',
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
    'You look like movie star, ka!',
    'One photo together na?',
    'You dance with me later, ka?',
    'Your friend Karl, he come too?',
    'You make me laugh, handsome man!',
    'Why you so serious na?',
  ],
  flirtRejected: [
    'Maybe later na?',
    'You talk too much, handsome man!',
    'First you stand straight, ka!',
    'You already have many bottle, ka!',
    'My friend like you more na!',
    'Later later, handsome man!',
    'You ask everybody, ka!',
    'Go drink some water na.',
    'Come back when you can walk, ka!',
  ],
  bargirlTaunt: [
    'Hey! No shouting, ka!',
    'You crazy man, go home!',
    'Not so loud, handsome man!',
    'Who is Karl na?',
    'You scare my customer, ka!',
    'Shhh! Music already loud!',
    'You break my ear, ka!',
    'Sit down, handsome man!',
    'Enough enough na!',
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
    '«Fahrausweise, die Herrschaften.»',
    '«Nein, das gilt hier nicht.»',
    '«Sie halten den ganzen Wagen auf.»',
    '«Ich frage ein letztes Mal.»',
    '«Wir haben Vorschriften.»',
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
    '«Trinken Sie erst mal Wasser.»',
    '«Name? Richtiger Name?»',
    '«Sie sind nicht der Erste heute.»',
    '«Ruhe, oder es wird länger.»',
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
    '«Nimm dir ein Kissen.»',
    '«Die Küche ist unten.»',
    '«Wir essen um sieben.»',
    '«Bist du der Neue?»',
    '«Mach die Tür zu, bitte.»',
  ],
  // Die Hexe im Kreis: freundlich weggetreten, nie belehrend.
  witch: [
    '«Kannst du die Farben riechen?»',
    '«Der Teppich atmet mit.»',
    '«Ich höre gerade Dienstag.»',
    '«Dreh dich mit, dann wird das Zimmer rund.»',
    '«Die Wand hat mir zugezwinkert.»',
    '«Schmeckst du das Licht?»',
    '«Meine Hände sind heute aus Wasser.»',
    '«Alles hier ist nur geliehen, auch der Boden.»',
    '«Ich tanze schon seit Donnerstag.»',
    '«Hörst du, wie die Pflanze summt?»',
    '«Die Zeit läuft hier im Kreis, wie ich.»',
    '«Fass mal die Luft an, die ist ganz weich.»',
  ],
  yoga: [
    '«Und einatmen …»',
    '«Bitte leise, wir atmen gerade.»',
    '«Finde deine Mitte, Tobi.»',
    '«Sonnengruss, nicht Sondergruss.»',
    '«Atme durch die Nase, nicht durchs Gesicht.»',
    '«Wir halten das noch drei Atemzüge.»',
    '«Dein Becken ist sehr verspannt.»',
    '«Der Atem kommt von unten.»',
    '«Nicht drücken, fliessen lassen.»',
    '«Schuhe bitte draussen.»',
  ],
  /** Seated travellers in the train, startled out of a long journey. */
  passenger: [
    '«Ssst!»',
    '«Ich schlafe hier.»',
    '«Noch fünf Stunden …»',
    '«Setz dich doch einfach.»',
    '«Nicht schon wieder einer.»',
    '«Ist das der richtige Zug?»',
    '«Meine Tasche, bitte!»',
    '«Wie spät ist es?»',
    '«Ich steig gleich aus.»',
    '«Ruhe, bitte.»',
  ],
  /** Shouted the moment a patrol gets eyes on Tobi. */
  policeSpotted: [
    '«HALT! STEHEN BLEIBEN!»',
    '«STOPP! POLIZEI!»',
    '«HALT! KEINEN SCHRITT WEITER!»',
    '«SIE DA! STEHEN BLEIBEN!»',
    '«POLIZEI! NICHT BEWEGEN!»',
    '«STOPP! SOFORT STEHEN BLEIBEN!»',
  ],
  /** Kept up while the chase runs, at a slower cadence than the first shout. */
  policeChase: [
    '«Bleiben Sie stehen!»',
    '«Das macht es nur schlimmer!»',
    '«Sie kommen da nicht durch!»',
    '«Ich sehe Sie!»',
    '«Hinterher!»',
    '«Er läuft nach da vorne!»',
    '«Verstärkung anfordern!»',
    '«Das wird teuer, mein Herr!»',
    '«Sie machen das schlimmer als es ist!»',
    '«Stehen bleiben, letzte Warnung!»',
    '«Bleiben Sie, wo Sie sind!»',
    '«Nicht weglaufen!»',
    '«Er geht Richtung Wasser!»',
    '«Absperren!»',
  ],
  /** Muttered once the sightline breaks and the patrol is guessing. */
  policeSearch: [
    '«Wo ist er hin?»',
    '«Haben Sie ihn noch?»',
    '«Er muss hier irgendwo sein.»',
    '«Ich hab ihn verloren.»',
    '«Abschnitt absuchen!»',
    '«Der kann nicht weit sein.»',
    '«Kollege, Sichtkontakt?»',
    '«Alles absuchen, langsam.»',
    '«Nichts zu sehen.»',
    '«Prüf mal da hinten.»',
    '«Weitersuchen.»',
  ],
  policeCaught: [
    '«Sie kommen jetzt mit.»',
    '«Das war es für heute.»',
    '«Hände sichtbar lassen.»',
    '«Ruhig bleiben, es ist vorbei.»',
    '«Ab in den Wagen.»',
    '«Wir kennen keinen Karl.»',
    '«Sie erzählen das gleich nochmal.»',
    '«Alles Weitere auf dem Posten.»',
  ],
  /** Said unprompted when Tobi wanders into someone's personal space. */
  greeting: [
    '«Oh, hallo.»',
    '«Hoi.»',
    '«Ja bitte?»',
    '«Kann ich helfen?»',
    '«Alles guet?»',
    '«Du bist neu hier, oder?»',
    '«Sali zäme.»',
    '«Grüezi.»',
    '«Schön, dich zu sehen.»',
    '«Pass auf, wo du hinläufst!»',
    '«Hoppla.»',
    '«Hey, nicht so nah.»',
    '«Suchst du wen?»',
    '«Brauchst du was?»',
    '«Alles in Ordnung bei dir?»',
    '«Tag zäme.»',
    '«Vorsicht!»',
    '«Du siehst durstig aus.»',
  ],
  greetingBar: [
    'Hello handsome man!',
    'Welcome, welcome na!',
    'You want drink, ka?',
    'Come in, come in!',
    'First time here na?',
    'Sit sit, plenty space!',
    'Hello! You look thirsty, ka!',
    'Hello hello, come in na!',
    'Best bar here, ka!',
    'You looking for someone na?',
  ],
  greetingYoga: [
    '«Schhh.»',
    '«Wir sind mitten drin.»',
    '«Magst du mitmachen?»',
    '«Leise, bitte.»',
    '«Atme erst mal durch.»',
    '«Da hinten ist noch eine Matte.»',
    '«Wir sind gleich fertig.»',
    '«Setz dich einfach dazu.»',
  ],
  greetingTrain: [
    '«Ist da noch frei?»',
    '«Setz dich doch.»',
    '«Lange Fahrt, hm?»',
    '«Vorsicht, mein Gepäck.»',
    '«Fährt der pünktlich?»',
    '«Willst du auch was trinken?»',
    '«Der Barwagen ist vorne.»',
    '«Halt dich fest, gleich kommt die Kurve.»',
    '«Schon lange unterwegs?»',
  ],
  /** Standing drinkers in the bar carriage and on the Nana stools. */
  barGuest: [
    '«Prost!»',
    '«Noch eins?»',
    '«Der Wagen schwankt, nicht du.»',
    '«Erzähl das dem Schaffner.»',
    '«Wer ist jetzt Karl?»',
    '«Setz dich, Kollege.»',
    '«Zwei Bier, bitte!»',
    '«Auf Karl!»',
    '«Was trinkst du?»',
    '«Läuft bei dir, hm?»',
  ],
};

/** Which language a topic is written in. The bar girls speak English; everyone else de-CH.
 * Kept as data rather than guessed from the text, so a speech synthesiser picks the right voice
 * instead of reading «Handsome man!» with a German one.
 */
const ENGLISH: ReadonlySet<SpeechTopic> = new Set<SpeechTopic>([
  'nanaSecurity',
  'nanaBartender',
  'nanaTourist',
  'nanaExpat',
  'nanaVendor',
  'nanaTaxi',
  'nanaDrunk',
  'flirt',
  'flirtRejected',
  'bargirlTaunt',
  'greetingBar',
]);

export function speechLanguage(topic: SpeechTopic): 'de' | 'en' {
  return ENGLISH.has(topic) ? 'en' : 'de';
}

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
