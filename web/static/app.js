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
        
        storyTitle: "Echoes of the Void",
        storyBeat: "Prologue",
        placeholder: "Enter your action or ask Gemma...",
        turnCount: 0,
        
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
        models: [],
        config: { theme: 'fantasy', tone: 'heroic', duration: '15min', partyMode: 'solo', model: 'gemma4:e4b', language: 'fr' },
        
        abortController: null,

        // --- Core Lifecycle ---
        async init() {
            try {
                const partyData = await window.API.fetchParty();
                if (partyData && partyData.length > 0) {
                    this.party = partyData;
                    this.showSetup = false;
                    
                    const journalData = await window.API.fetchJournal();
                    const chat = document.getElementById('chat-history');
                    chat.innerHTML = '';
                    journalData.forEach(entry => window.UI.addMessage(entry.content, entry.role, null, this.party));
                    
                this.inventory = await window.API.fetchInventory();
                } else {
                    this.showSetup = true;
                }
                
                // Load Ollama models
                this.models = await window.API.fetchModels();
                if (this.models.length > 0 && !this.models.includes(this.config.model)) {
                    this.config.model = this.models[0];
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
            if (this.config.partyMode === 'companions') {
                for (let other of this.charOptions) {
                    if (other.name !== char.name && this.party.length < 3) {
                        const sidekick = { ...other, hp: 20, max_hp: 20 };
                        this.party.push(sidekick);
                        await window.API.selectCharacter(sidekick);
                    }
                }
            }

            this.showSetup = false;
            this.triggerIntro();
        },

        async triggerIntro() {
            window.UI.shiftColors();
            this.isThinking = true;
            this.storyTitle = "Echoes of the Void"; // Force initial title
            this.storyBeat = "Prologue"; // Force initial beat
            const aiMsgDiv = window.UI.addMessage('', 'ai', null, this.party);
            const response = await window.API.chat("Gemma, describe the starting scene and introduce the quest.", []);
            await this.streamAI(response, aiMsgDiv);
            this.isThinking = false;
        },

        // --- Narrative Engine ---
        async sendInterrupt(action) {
            if (this.isThinking) return;
            const interruptMsg = `[INTERRUPT: ${action}]`;
            
            // Add a small visual feedback in the chat (optional, but good for "Studio" feel)
            let label = action.replace('INTERRUPT_', '');
            window.UI.addMessage(`*Action immédiate : ${label}*`, 'user', null, this.party);
            
            this.isThinking = true;
            const aiMsgDiv = window.UI.addMessage('', 'ai', null, this.party);
            
            try {
                const response = await window.API.chat(interruptMsg, []);
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
            this.previewImage = null;

            const aiMsgDiv = window.UI.addMessage('', 'ai', null, this.party);
            this.turnCount++; // Increment turn for the AI Director
            
            try {
                const response = await window.API.chat(message, images, this.turnCount, this.abortController.signal);
                await this.streamAI(response, aiMsgDiv);
            } catch (e) { }
            finally { 
                this.isThinking = false; 
            }
        },

        async streamAI(response, div) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            this.isNarrating = true;
            window.processedSkills = window.processedSkills || new Set();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                fullText += decoder.decode(value, { stream: true });
                window.UI.updateAIMessage(div, fullText);
                this.processTriggers(fullText);
            }
            this.isNarrating = false;
        },

        processTriggers(fullText) {
            // Ambiance / Sound
            const ambianceMatch = fullText.match(/\[\[(AMBIANCE|SOUND):\s*(.*?)\]\]/i);
            if (ambianceMatch && !window.processedSkills.has('AMBIANCE_' + ambianceMatch[0])) {
                const mood = ambianceMatch[2].trim().toUpperCase();
                window.UI.shiftColors(mood); // Reactive Ambilight!
                window.processedSkills.add('AMBIANCE_' + ambianceMatch[0]);
            }

            // QTE
            const qteMatch = fullText.match(/\[\[SKILL: QTE,\s*(.*?),\s*(.*?)\]\]/i);
            if (qteMatch && !this.qte.active && !window.processedSkills.has(qteMatch[0])) {
                window.processedSkills.add(qteMatch[0]);
                const seq = qteMatch[1].toUpperCase().replace(/[^WASD]/g, '').substring(0,4).split('');
                this.startQTE(seq, parseInt(qteMatch[2]) || 5);
            }

            // Items / Loot
            const itemMatch = fullText.match(/\[\[ADD_ITEM:\s*(.*?),\s*(.*?)\]\]/i);
            if (itemMatch && !window.processedSkills.has('ITEM_' + itemMatch[0])) {
                const itemName = itemMatch[1].trim();
                const itemImg = itemMatch[2].trim();
                this.inventory.push({ name: itemName, image: itemImg });
                window.API.saveInventory(this.inventory);
                window.processedSkills.add('ITEM_' + itemMatch[0]);
            }

            // Danger Level (Combat)
            const dangerMatch = fullText.match(/\[\[DANGER:\s*([\+\-]?\d+)\]\]/i);
            if (dangerMatch) {
                const val = parseInt(dangerMatch[1]);
                if (dangerMatch[1].startsWith('+') || dangerMatch[1].startsWith('-')) {
                    this.dangerLevel = Math.max(0, Math.min(100, this.dangerLevel + val));
                } else {
                    this.dangerLevel = Math.max(0, Math.min(100, val));
                }
                
                // On ne force plus le rouge ici pour laisser le tag [[AMBIANCE]] de l'IA décider
                // Sauf si le danger est critique (>75%), là on peut forcer une alerte visuelle.
                if (this.dangerLevel >= 75) {
                    window.UI.shiftColors('DANGER');
                }
            }

            // --- Skill Triggers ---

            // COMBAT
            const combatMatch = fullText.match(/\[\[SKILL: COMBAT,\s*(.*?)\]\]/i);
            if (combatMatch && !window.processedSkills.has(combatMatch[0])) {
                window.processedSkills.add(combatMatch[0]);
                this.placeholder = "Combat initiated! Choose your tactical action...";
            }

            // VISION
            const visionMatch = fullText.match(/\[\[SKILL: VISION,\s*(.*?)\]\]/i);
            if (visionMatch && !window.processedSkills.has(visionMatch[0])) {
                window.processedSkills.add(visionMatch[0]);
                this.placeholder = "👁️ Vision quest: Upload a relevant image...";
            }

            // --- Interaction Tag Parsing ---
            
            // 1. INTERRUPTS (Dynamic reacting - Bottom Bar)
            const intMatches = Array.from(fullText.matchAll(/\*?\*?\[{2}INTERRUPTS?:\s*([\s\S]*?)\]{2}\*?\*?/gi));
            if (intMatches.length > 0) {
                let allInts = [];
                intMatches.forEach(match => {
                    const tagContent = match[1].trim();
                    let rawItems = tagContent.split(',').map(s => s.trim()).filter(s => s.length > 0);
                    
                    // Fallback: if no commas but multiple pipes, model might be using | as item separator
                    if (rawItems.length === 1 && (rawItems[0].match(/\|/g) || []).length > 2) {
                        const pipes = rawItems[0].split('|').map(s => s.trim());
                        if (pipes.length >= 6 && pipes.length % 3 === 0) {
                            rawItems = [];
                            for(let k=0; k<pipes.length; k+=3) rawItems.push(`${pipes[k]}|${pipes[k+1]}|${pipes[k+2]}`);
                        } else {
                            rawItems = pipes;
                        }
                    }

                    const parts = rawItems.map(i => {
                        // Clean up any extra [METADATA] or ** markers the model might have added
                        let cleanItem = i.replace(/\[.*?\]/g, '').replace(/\*/g, '').trim();
                        const p = cleanItem.split('|').map(s => s.trim());
                        
                        if (p.length === 1) {
                            const itemText = p[0];
                            const iconMatch = itemText.match(/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])\s*(.*)$/);
                            if (iconMatch && iconMatch[2]) return { icon: iconMatch[1], label: iconMatch[2].toUpperCase(), action: iconMatch[2] };
                            if (iconMatch) return null; // Skip lone icons
                            return { icon: '👉', label: itemText.toUpperCase(), action: itemText };
                        }
                        return { icon: p[0]||'👉', label: (p[1]||p[0]).toUpperCase(), action: p[2]||p[1]||p[0] };
                    }).filter(x => x !== null);
                    allInts = allInts.concat(parts);
                });
                this.interrupts = allInts.slice(0, 3);
            }

            // 2. OPTIONS (Main Narrative Choices - End of message)
            const optMatches = Array.from(fullText.matchAll(/\*?\*?\[{1,2}OPTIONS?[:\s]*([\s\S]*?)\]{1,2}\*?\*?/gi));
            if (optMatches.length > 0) {
                let allOpts = [];
                optMatches.forEach(match => {
                    const tagContent = match[1].trim();
                    let rawItems = tagContent.split(',').map(s => s.trim()).filter(s => s.length > 0);
                    
                    // Fallback: if no commas but multiple pipes, model might be using | as item separator
                    if (rawItems.length === 1 && (rawItems[0].match(/\|/g) || []).length > 2) {
                        const pipes = rawItems[0].split('|').map(s => s.trim());
                        if (pipes.length >= 6 && pipes.length % 3 === 0) {
                            rawItems = [];
                            for(let k=0; k<pipes.length; k+=3) rawItems.push(`${pipes[k]}|${pipes[k+1]}|${pipes[k+2]}`);
                        } else {
                            rawItems = pipes;
                        }
                    }

                    const parts = rawItems.map(i => {
                        // Clean up any extra [METADATA] or ** markers the model might have added
                        let cleanItem = i.replace(/\[.*?\]/g, '').replace(/\*/g, '').trim();
                        const p = cleanItem.split('|').map(s => s.trim());
                        
                        if (p.length === 1) {
                            const itemText = p[0];
                            const iconMatch = itemText.match(/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])\s*(.*)$/);
                            if (iconMatch && iconMatch[2]) return { icon: iconMatch[1], label: iconMatch[2].toUpperCase(), action: iconMatch[2] };
                            if (iconMatch) return null; 
                            return { icon: '✨', label: itemText.toUpperCase(), action: itemText };
                        }
                        return { icon: p[0]||'✨', label: (p[1]||p[0]).toUpperCase(), action: p[2]||p[1]||p[0] };
                    }).filter(x => x !== null);
                    
                    if (parts.length > 0) {
                        allOpts = allOpts.concat(parts);
                    }
                });
                if (allOpts.length > 0) this.options = allOpts.slice(0, 3);
            } else if (this.options.length === 0 && !this.isThinking && !this.isNarrating && fullText.length > 100) {
                // FALLBACK for OPTIONS: only if narration is truly finished and no options were found
                const last300 = fullText.slice(-300);
                const bullets = last300.match(/^[\*\-]\s*(.*)$/gm);
                if (bullets && bullets.length > 0) {
                    this.options = bullets.slice(0, 3).map(b => {
                        const label = b.replace(/^[\*\-]\s*/, '').split(':')[0].trim();
                        return { icon: '👉', label: label.substring(0, 30).toUpperCase(), action: label };
                    });
                } else if (fullText.length > 500) {
                    this.options = [{ icon: '✨', label: 'CONTINUE...', action: 'Continue the story.' }];
                }
            }

            const pMatch = fullText.match(/\[\[PLACEHOLDER:\s*(.*?)\]\]/i);
            if (pMatch) this.placeholder = pMatch[1];

            const focusMatch = fullText.match(/\[\[FOCUS:\s*(.*?)\]\]/i);
            if (focusMatch) this.focusHero = focusMatch[1].trim();
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
