
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "tabletop.werewolf.moderatorVoice";
const AUDIO_BASE = "/audio/werewolf/moderator";

function audioFileForLine(text: string) {
  const line = text.trim();

  if (!line) return null;

  if (line === "The village gathers beneath a cold moon. Look at your role, and keep it secret.") return "01-role-reveal.mp3";

  if (line.startsWith("Night falls. Werewolves")) return "10-werewolves-awaken.mp3";
  if (line.startsWith("Night falls. Doctor")) return "13-doctor-awaken.mp3";
  if (line.startsWith("Night falls. Seer")) return "16-seer-awaken.mp3";
  if (line.startsWith("Night falls. Bodyguard")) return "19-bodyguard-awaken.mp3";
  if (line.startsWith("Night falls. Vigilante")) return "22-vigilante-awaken.mp3";
  if (line.startsWith("Night falls. Witch")) return "25-witch-awaken.mp3";
  if (line.startsWith("Night falls. Serial Killer")) return "29-serial-killer-awaken.mp3";
  if (line.startsWith("Night falls.")) return "02-night-falls.mp3";

  if (line.startsWith("Morning comes.")) {
    if (/\d+ players did not survive the night/i.test(line)) return "34-multiple-deaths.mp3";
    if (/did not survive the night/i.test(line)) return "32-someone-died.mp3";
    if (/everyone survived|survived the night/i.test(line)) return "33-no-one-died.mp3";
    return "03-morning-comes.mp3";
  }

  if (line.startsWith("The village awakens") || line.startsWith("The village begins discussion")) return "04-day-discussion.mp3";
  if (line.startsWith("The time for talk is over")) return "05-voting-begins.mp3";
  if (line === "The village has made its decision.") return "06-vote-result.mp3";
  if (line.includes("has been condemned by the village")) return "42-player-condemned.mp3";
  if (line.includes("steps back from the gallows")) return "40-vote-pass.mp3";
  if (line.includes("could not agree")) return "41-vote-tie.mp3";

  if (line === "The game is over. The truth has finally come to light.") return "07-game-over.mp3";
  if (line.includes("Werewolves are gone") || line.includes("Village has won")) return "47-villagers-win-grand.mp3";
  if (line.includes("Werewolves have taken control") || line.includes("Werewolves have won")) return "49-werewolves-win-grand.mp3";
  if (line.includes("Jester has won")) return "50-jester-wins.mp3";
  if (line.includes("Serial Killer stands alone")) return "51-serial-killer-wins.mp3";
  if (line.includes("lone player has claimed victory")) return "52-solo-wins.mp3";

  return null;
}

export function useModeratorVoice() {
  const [enabled, setEnabled] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    setEnabled(localStorage.getItem(STORAGE_KEY) !== "off");
  }, []);

  const stopCurrentAudio = useCallback(() => {
    const current = currentAudioRef.current;
    if (!current) return;
    current.pause();
    current.currentTime = 0;
    currentAudioRef.current = null;
  }, []);

  const setVoiceEnabled = useCallback(
    (next: boolean) => {
      setEnabled(next);
      localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      if (!next) stopCurrentAudio();
    },
    [stopCurrentAudio]
  );

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !text || typeof window === "undefined") return;

      const fileName = audioFileForLine(text);
      if (!fileName) return;

      const src = `${AUDIO_BASE}/${fileName}`;
      if (lastPlayedRef.current === src) return;
      lastPlayedRef.current = src;

      stopCurrentAudio();

      const audio = new Audio(src);
      audio.volume = 0.96;
      currentAudioRef.current = audio;

      audio.addEventListener("ended", () => {
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
      });

      void audio.play().catch(() => {
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
      });
    },
    [enabled, stopCurrentAudio]
  );

  return { voiceEnabled: enabled, setVoiceEnabled, speak };
}
