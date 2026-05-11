class AudioEngine {
    constructor() {
        this.ctx = null;
        this.sources = {};
        this.activeSource = null;
        this.activeKey = null;
        this.enabled = false;
        this.speechEnabled = false; // The Sound of Fate
        this.voice = null;
        this._spokenNarrative = ''; // tracks what's already been spoken this turn
        this._isSpeaking = false;   // prevents overlapping sentence reads
        // 🔇 Ambient music disabled — audio files not yet available.
        // To re-enable: add the corresponding MP3 files to /web/static/audio/
        this.library = {
            // 'MYSTERY': '/static/audio/mystery.mp3',
            // 'TENSION': '/static/audio/tension.mp3',
            // 'ACTION': '/static/audio/action.mp3',
            // 'RAIN': '/static/audio/rain.mp3'
        };
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.enabled = true;
            console.log("🎵 Audio Engine Initialized");
            
            // Global unlock on first interaction
            const unlock = () => {
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume().then(() => {
                        console.log("🎵 Audio Context Unlocked via User interaction");
                        window.removeEventListener('click', unlock);
                        window.removeEventListener('keydown', unlock);
                        window.removeEventListener('touchstart', unlock);
                    });
                }
            };
            window.addEventListener('click', unlock);
            window.addEventListener('keydown', unlock);
            window.addEventListener('touchstart', unlock);
        } catch (e) {
            console.error("AudioContext not supported", e);
        }
    }

    async resume() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    async play(key) {
        if (!this.ctx) this.init();
        if (!this.enabled) return;
        await this.resume();
        
        if (this.activeKey === key) return;

        let url = this.library[key];
        
        // Handle combined keys like TENSION|MYSTERY
        if (!url && key.includes('|')) {
            const keys = key.split('|');
            for (const k of keys) {
                if (this.library[k.trim()]) {
                    url = this.library[k.trim()];
                    key = k.trim();
                    break;
                }
            }
        }

        if (!url) {
            console.warn(`Unknown sound key: ${key}`);
            return;
        }

        // Fade out current
        if (this.activeSource) {
            const currentSource = this.activeSource;
            const gainNode = currentSource.gainNode;
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2);
            setTimeout(() => currentSource.stop(), 2000);
        }

        // Load and play new
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            console.log(`✅ Audio Loaded: ${key}`);

            const source = this.ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;

            const gainNode = this.ctx.createGain();
            gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 2);

            source.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            source.start(0);
            
            this.activeSource = source;
            this.activeSource.gainNode = gainNode;
            this.activeKey = key;

        } catch (e) {
            console.error("Failed to play audio:", e);
        }
    }

    stop() {
        if (this.activeSource) {
            this.activeSource.stop();
            this.activeSource = null;
            this.activeKey = null;
        }
        window.speechSynthesis.cancel();
    }

    // --- The Sound of Fate (TTS) ---
    toggleSpeech(lang = 'fr') {
        this.speechEnabled = !this.speechEnabled;
        console.log(`🎙️ TTS ${this.speechEnabled ? 'ENABLED' : 'DISABLED'} for ${lang}`);

        if (!this.speechEnabled) {
            window.speechSynthesis.cancel();
            this._ttsQueue = [];
        } else {
            // Load voices — async on Chrome, sync on Firefox/Safari
            const trySetVoice = (targetLang) => {
                const voices = window.speechSynthesis.getVoices();
                
                // Mapping preferences
                if (targetLang.startsWith('fr')) {
                    this.voice = voices.find(v => v.name.includes('Amélie'))
                        || voices.find(v => v.lang.startsWith('fr') && (v.name.includes('Thomas') || v.name.includes('Paul')))
                        || voices.find(v => v.lang.startsWith('fr'));
                } else {
                    this.voice = voices.find(v => v.name.includes('Catherine'))
                        || voices.find(v => v.lang.startsWith('en') && (v.name.includes('Daniel') || v.name.includes('Samantha')))
                        || voices.find(v => v.lang.startsWith('en'));
                }

                // Final fallback
                if (!this.voice) this.voice = voices[0] || null;
                
                console.log(`🎙️ Voice matched for ${targetLang}: ${this.voice ? this.voice.name : 'none'}`);
                if (this.voice) this._doSpeak(targetLang.startsWith('fr') ? "Voix du destin activée." : "Voice of Fate activated.");
            };

            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) {
                window.speechSynthesis.addEventListener('voiceschanged', () => trySetVoice(lang), { once: true });
            } else {
                trySetVoice(lang);
            }
        }
        return this.speechEnabled;
    }

    // Internal: actually speak a clean string — called only after voice is selected
    _doSpeak(text) {
        if (!text || text.trim() === '') return;

        // Cancel any ongoing speech first
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text.trim());
        if (this.voice) utterance.voice = this.voice;
        utterance.pitch = 0.65;
        utterance.rate = 0.88;
        utterance.volume = 1.0;
        utterance.lang = this.voice ? this.voice.lang : 'fr-FR';

        utterance.onstart = () => console.log(`🔊 TTS speaking: "${text.substring(0, 60)}..."`);
        utterance.onerror = (e) => console.error(`🔴 TTS Error: ${e.error}`);

        window.speechSynthesis.speak(utterance);
        console.log(`🎙️ speechSynthesis.pending: ${window.speechSynthesis.pending}, speaking: ${window.speechSynthesis.speaking}`);
    }

    // Public: called with full narrative text at end of stream
    speak(text) {
        if (!this.speechEnabled) return;
        if (!text || text.trim() === '') return;

        // Strip reasoning block, [[TAGS]], markdown symbols, and HTML
        let clean = text
            .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
            .replace(/\[\[[\s\S]*?\]\]/g, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[\*\_\#\`]/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

        if (clean === '') return;

        // Split into sentences, speak each
        const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
        let idx = 0;
        const speakNext = () => {
            if (!this.speechEnabled || idx >= sentences.length) { this._isSpeaking = false; return; }
            const s = sentences[idx++].trim();
            if (!s) { speakNext(); return; }
            const utt = new SpeechSynthesisUtterance(s);
            if (this.voice) utt.voice = this.voice;
            utt.pitch = 0.65; utt.rate = 0.88; utt.volume = 1.0;
            utt.lang = this.voice ? this.voice.lang : 'fr-FR';
            utt.onend = speakNext;
            utt.onerror = (e) => { console.error(`🔴 TTS: ${e.error}`); speakNext(); };
            window.speechSynthesis.speak(utt);
        };
        window.speechSynthesis.cancel();
        this._isSpeaking = true;
        speakNext();
    }

    // --- VOICEOVER MODE (Stable & Guided) ---
    // Reads ONLY the <voiceover> block once it's completely received.
    streamSpeak(fullText) {
        if (!this.speechEnabled || this._isSpeaking) return;

        // Check if the voiceover block is finished
        if (fullText.toLowerCase().includes('</voiceover>')) {
            const parts = fullText.split(/<voiceover>/i);
            if (parts.length < 2) return;
            
            const rawVoiceover = parts[parts.length - 1].split(/<\/voiceover>/i)[0];
            if (!rawVoiceover) return;

            // Check if we already spoke this specific block
            // (Comparing content to avoid re-triggering on subsequent stream chunks)
            if (this._spokenNarrative === rawVoiceover) return;

            const clean = rawVoiceover
                .replace(/\[\[[\s\S]*?\]\]/g, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/[\*\_\#\`]/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim();

            if (clean.length > 3) {
                this._spokenNarrative = rawVoiceover; // Mark as spoken
                this._doSpeak(clean);
            }
        }
    }

    // Call at the start of each AI turn to reset the spoken state
    resetTurn() {
        this._spokenNarrative = '';
        this._isSpeaking = false;
        window.speechSynthesis.cancel();
    }
}

window.audioEngine = new AudioEngine();
window.audioEngine.init();
