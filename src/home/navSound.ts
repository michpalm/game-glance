/**
 * Sound feedback for carousel navigation.
 * Tries Steam's native navigation sound (/sounds/deck_ui_misc_10.wav) first,
 * and falls back to Web Audio synthesis.
 */

let audioContext: AudioContext | null = null;

function playSynthesizedNavSound() {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioContext || audioContext.state === 'closed') {
            audioContext = new AudioCtx();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(() => {});
        }
        const ctx = audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(340, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.045);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.045);
    } catch {
        // AudioContext unavailable
    }
}

export function playNavSound() {
    try {
        const nativeSound = new Audio('/sounds/deck_ui_misc_10.wav');
        nativeSound.volume = 0.5;
        const promise = nativeSound.play();
        if (promise) {
            promise.catch(() => {
                playSynthesizedNavSound();
            });
            return;
        }
    } catch {
        // fallback
    }
    playSynthesizedNavSound();
}
