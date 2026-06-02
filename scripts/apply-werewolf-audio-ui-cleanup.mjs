import { readFileSync, writeFileSync } from "node:fs";

const file = "apps/web/src/features/games/mafia-werewolf/MafiaWerewolfTable.tsx";
let source = readFileSync(file, "utf8");

source = source.replace(
  "const { voiceEnabled, setVoiceEnabled, voiceMode, setVoiceMode, speak } = useModeratorVoice();",
  "const { voiceEnabled, setVoiceEnabled, speak } = useModeratorVoice();"
);

source = source.replace(/\n\s*<button type="button" className="rounded-full border border-white\/10 bg-black\/42 px-3 py-2 text-xs font-black uppercase tracking-\[0\.16em\] text-white\/65 backdrop-blur-md" onClick=\{\(\) => setVoiceMode\(voiceMode === "gloom" \? "calm" : "gloom"\)\}>\n\s*\{voiceMode === "gloom" \? "Gloom voice" : "Calm voice"\}\n\s*<\/button>/, "");

writeFileSync(file, source);
console.log("Removed the Gloom/Calm voice toggle. Custom MP3 moderator audio is now the only voice path.");
