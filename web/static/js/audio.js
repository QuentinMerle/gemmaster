class AudioEngine {
    constructor() {
        this.ctx = null;
        this.sources = {};
        this.activeSource = null;
        this.activeKey = null;
        this.enabled = false;
        this.library = {
            'MYSTERY': '/static/audio/mystery.mp3',
            'TENSION': '/static/audio/tension.mp3',
            'ACTION': '/static/audio/action.mp3',
            'RAIN': '/static/audio/rain.mp3'
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
    }
}

window.audioEngine = new AudioEngine();
window.audioEngine.init(); // Attempt early init
