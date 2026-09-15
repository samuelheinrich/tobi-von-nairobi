/** Public authoring entry point; geometry, residents and gameplay consume these same records. */
export { nanaWorld, nanaTour } from './nana-plaza/world.js';
export { nanaVenues, nanaDrinks, type NanaVenueDefinition } from './nana-plaza/venues.js';
export {
  nanaResidents,
  danceNames,
  type NanaRole,
  type NanaResident,
  type DanceName,
  type AmbientAction,
} from './nana-plaza/npcs.js';
