// Prints the composition's scene list as JSON on stdout.
// Used by the GUI server (/api/scenes) as the single source of truth for
// scene ids + narration text when generating voiceover.
import { SCENES } from "../src/integration/scenes";

console.log(JSON.stringify(SCENES));
