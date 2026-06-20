import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

let bell: AudioPlayer | null = null;

export async function initAudio(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
  });
  if (!bell) {
    try {
      // Placeholder hasta que se agregue el asset real en assets/sounds/bell.mp3.
      bell = createAudioPlayer(require('@/assets/sounds/bell.mp3'));
    } catch {
      bell = null;
    }
  }
}

export function playBell(): void {
  if (!bell) return;
  try {
    bell.seekTo(0);
    bell.play();
  } catch {
    /* ignore — audio errors no son críticos */
  }
}

export function releaseAudio(): void {
  bell?.release();
  bell = null;
}
