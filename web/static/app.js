/**
 * 💎 GEMMASTER - MAIN ORCHESTRATOR
 * Alpine.js entry point. Orchestrates State, UI, and AI Stream.
 */

function gameState() {
    return {
        // --- State ---
        darkMode: true,
        showSetup: true,
        showSelection: false,
        showInventory: false,
        showResetConfirm: false,
        loadingSetup: false,
        isThinking: false,
        isNarrating: false,
        wizardStep: 1,
        wizardDir: 'forward',
        
        storyTitle: "Echoes of Destiny",
        storyBeat: "Prologue",
        placeholder: "Enter your action or ask Gemma...",
        turnCount: 0,
        voiceActive: false,
        showDashboard: true,
        
        party: [],
        charOptions: [],
        options: [],
        inventory: [],
        dangerLevel: 0,
        interrupts: [],
        focusHero: null,
        
        qte: { active: false, sequence: [], currentIdx: 0, timer: 0, maxTimer: 5 },
        customHero: { name: '', class: '', background: '' },
        customizing: false,
        previewImage: null,
        visionQuest: { active: false, description: '' },
        models: [],
        engineStatus: { status: 'checking', model: '' },
        config: { theme: 'fantasy', tone: 'heroic', duration: '15min', partyMode: 'solo', model: 'gemma4:e4b', language: 'fr' },
        
        abortController: null,

        // --- Core Lifecycle ---
        async init() {
            // Early initialization of critical globals
            window.processedSkills = new Set();
            
            try {
                const partyData = await window.API.fetchParty();
                if (partyData && partyData.length > 0) {
                    this.party = partyData;
                    this.showSetup = false;
                    
                    const journalData = await window.API.fetchJournal();
                    const chat = document.getElementById('chat-history');
                    chat.innerHTML = '';
                    journalData.forEach(entry => window.UI.addMessage(entry.content, entry.role, null, this.party));
                    
                    // Restoring State from Journal
                    const aiEntries = journalData.filter(e => e.role === 'ai');
                    this.turnCount = aiEntries.length; 
                    
                    if (aiEntries.length > 0) {
                        const lastAiText = aiEntries[aiEntries.length - 1].content;
                        // Use a small timeout to ensure DOM and UI helpers are fully ready
                        setTimeout(() => {
                            window.processedSkills.clear(); // Ensure we can re-process the last message
                            this.processTriggers(lastAiText);
                        }, 100);
                    }
                    
                    this.inventory = await window.API.fetchInventory();
                } else {
                    this.showSetup = true;
                }
                
                // Load Ollama models
                this.models = await window.API.fetchModels();
                if (this.models.length > 0 && !this.models.includes(this.config.model)) {
                    this.config.model = this.models[0];
                }

                // Check Engine Status
                this.engineStatus = await window.API.getEngineStatus();
                if (this.engineStatus.status !== 'online') {
                    console.warn("⚠️ Engine issues detected:", this.engineStatus);
                }

                // Title/Beat listeners
                window.addEventListener('update-title', (e) => { this.storyTitle = e.detail; });
                window.addEventListener('update-beat', (e) => { this.storyBeat = e.detail; });
            } catch (e) { console.log("New session initiated."); }
        },

        // --- UI Interactions ---

        async generateHeroes() {
            this.loadingSetup = true;
            try {
                const res = await window.API.setupGame(this.config);
                if (res.ok) {
                    this.charOptions = await window.API.getCharacterOptions();
                    this.wizardStep = 4;
                }
            } finally { this.loadingSetup = false; }
        },

        async selectCharacter(char) {
            if (this.isThinking) return;
            
            this.party = [{ ...char, hp: 20, max_hp: 20 }];
            await window.API.selectCharacter(char);

            // Auto-recruit sidekicks
            // Auto-recruit 1 sidekick managed by AI
            if (this.config.partyMode === 'sidekick') {
                for (let other of this.charOptions) {
                    if (other.name !== char.name && this.party.length < 2) {
                        const sidekick = { ...other, hp: 20, max_hp: 20, isSidekick: true };
                        this.party.push(sidekick);
                        await window.API.selectCharacter(sidekick);
                    }
                }
            }

            this.showSetup = false;
            
            // Format dynamic header: Theme | Tone | Duration
            const configSummary = `${this.config.theme.toUpperCase()} | ${this.config.tone.toUpperCase()} | ${this.config.duration.toUpperCase()}`;
            this.storyBeat = configSummary;
            this.storyTitle = "Echoes of Destiny"; 

            // Trigger Intro Narration
            window.UI.shiftColors();
            this.isThinking = true;
            const aiMsgDiv = window.UI.addMessage('', 'ai', null, this.party);
            const response = await window.API.chat("Gemma, describe the starting scene and introduce the quest.", []);
            await this.streamAI(response, aiMsgDiv);
            this.isThinking = false;
        },

        // --- Narrative Engine ---
        async sendInterrupt(action) {
            // Stop current narration if any
            if (this.isThinking || this.isNarrating) {
                if (this.abortController) {
                    this.abortController.abort();
                    console.log("🛑 Interrupting current narration...");
                }
            }

            // Important: Preserve turn count on interrupt
            this.turnCount++; 

            const interruptMsg = `[INTERRUPT: ${action}]`;
            
            // Add visual feedback
            let label = action.replace('INTERRUPT_', '');
            window.UI.addMessage(`*Réaction immédiate : ${label}*`, 'user', null, this.party);
            
            this.isThinking = true;
            this.isNarrating = false;
            this.interrupts = [];
            this.options = [];
            this.placeholder = "Gemma is weaving your destiny...";
            window.processedSkills = window.processedSkills || new Set();
            window.processedSkills.clear(); // Clear to allow immediate re-triggering of tools
            
            const aiMsgDiv = window.UI.addMessage('', 'ai', null, this.party);
            
            try {
                this.abortController = new AbortController();
                const response = await window.API.chat(interruptMsg, [], this.turnCount, this.abortController.signal);
                await this.streamAI(response, aiMsgDiv);
            } catch (err) {
                console.error("Interrupt error:", err);
            } finally {
                this.isThinking = false;
                window.UI.scrollBottom(true);
            }
        },

        async sendMessage(manualMessage = null) {
            if (this.abortController) this.abortController.abort();
            this.abortController = new AbortController();
            
            this.isNarrating = false;
            window.UI.shiftColors();
            
            const input = document.getElementById('user-input');
            const message = manualMessage || input.value.trim();
            
            // Guardrail: Min length or image required
            if (!manualMessage && !this.previewImage && message.length < 2) return;
            if ((!message && !this.previewImage) || (this.isThinking && !manualMessage)) return;

            // Add user message to UI
            if (message) window.UI.addMessage(message, 'user', null, this.party);
            
            if (!manualMessage) input.value = '';
            this.isThinking = true;
            this.isNarrating = false; // Keep it false to show the center loader
            this.interrupts = []; 
            this.options = []; 
            window.processedSkills = new Set();
            
            // Force scroll to show the thinking bubble
            setTimeout(() => window.UI.scrollBottom(true), 50);
            
            console.log("🧠 Gemma is thinking...");
            console.log("👥 Current Party State:", JSON.parse(JSON.stringify(this.party)));
            
            const images = this.previewImage ? [this.previewImage.split(',')[1]] : [];

            const aiMsgDiv = window.UI.addMessage('', 'ai', null, this.party);
            this.turnCount++; // Increment turn for the AI Director
            
            try {
                const response = await window.API.chat(message, images, this.turnCount, this.abortController.signal);
                await this.streamAI(response, aiMsgDiv);
            } catch (e) { }
            finally { 
                this.isThinking = false; 
                this.previewImage = null; // Clear image ONLY after processing is done
            }
        },

        async streamAI(response, div) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            this.isNarrating = true;
            window.processedSkills = window.processedSkills || new Set();

            // Reset TTS state for this new turn
            if (window.audioEngine) window.audioEngine.resetTurn();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                fullText += decoder.decode(value, { stream: true });
                window.UI.updateAIMessage(div, fullText);
                this.processTriggers(fullText);

                // Live TTS — read new complete sentences as they arrive
                if (window.audioEngine) window.audioEngine.streamSpeak(fullText);
            }
            this.isNarrating = false;
        },

        processTriggers(fullText) {
            if (window.StreamParser) {
                window.StreamParser.processTriggers(this, fullText);
            } else {
                console.warn("StreamParser not found.");
            }
        },

        // --- Mechanics ---
        startQTE(sequence, timer) {
            this.qte = { active: true, sequence, currentIdx: 0, timer, maxTimer: timer };
            const interval = setInterval(() => {
                this.qte.timer -= 0.1;
                if (this.qte.timer <= 0) {
                    clearInterval(interval);
                    if (this.qte.active) this.resolveQTE(false);
                }
            }, 100);

            const handler = (e) => {
                const key = e.key.toUpperCase();
                const expected = this.qte.sequence[this.qte.currentIdx].toUpperCase();
                if (key === expected) {
                    this.qte.currentIdx++;
                    if (this.qte.currentIdx >= this.qte.sequence.length) {
                        window.removeEventListener('keydown', handler);
                        clearInterval(interval);
                        this.resolveQTE(true);
                    }
                }
            };
            window.addEventListener('keydown', handler);
        },

        resolveQTE(success) {
            this.qte.active = false;
            this.sendMessage(`[QTE RESULT: ${success ? 'SUCCESS' : 'FAILURE'}]`);
        },

        async submitVision() {
            if (!this.previewImage || this.isThinking) return;
            
            // Keep portal open but show analysis state
            this.isThinking = true;
            
            // The actual message sent to the LLM
            const msg = `[VISION MANIFESTED: ${this.visionQuest.description}]`;
            
            // Use the standard send process which handles the image and API call
            await this.sendMessage(msg);
            
            // Close portal once the processing starts/finishes
            this.visionQuest.active = false;
        },

        interrupt(action) {
            this.isNarrating = false;
            if (this.abortController) this.abortController.abort();
            this.sendMessage(`[INTERRUPT: ${action.toUpperCase()}]`);
        },

        useItem(item) {
            this.previewImage = item.image;
            this.showInventory = false;
            document.getElementById('user-input').focus();
        },

        handleImageUpload(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ex) => this.previewImage = ex.target.result;
                reader.readAsDataURL(file);
            }
        },

        resetGame() { 
            console.log("🛠️ Reset requested");
            this.showResetConfirm = true; 
        },
        async executeReset() {
            console.log("🔥 Executing Reset...");
            this.showResetConfirm = false;
            try {
                await window.API.reset();
                console.log("✅ Reset success, reloading...");
                window.location.reload();
            } catch (err) {
                console.error("❌ Reset failed:", err);
                // Fallback: force reload anyway to try and clear state
                window.location.reload();
            }
        },

        saveState() {
            const state = {
                options: this.options,
                storyTitle: this.storyTitle,
                storyBeat: this.storyBeat,
                gameStarted: this.gameStarted,
                heroSelected: this.heroSelected,
                party: this.party
            };
            localStorage.setItem('gemmaster_session', JSON.stringify(state));
        },

        loadState() {
            const saved = localStorage.getItem('gemmaster_session');
            if (saved) {
                const state = JSON.parse(saved);
                this.options = state.options || [];
                this.storyTitle = state.storyTitle || 'Unnamed Saga';
                this.storyBeat = state.storyBeat || 'PROLOGUE';
                this.gameStarted = state.gameStarted || false;
                this.heroSelected = state.heroSelected || false;
                this.party = state.party || [];
            }
        }
    }
}
