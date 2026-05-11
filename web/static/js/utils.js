/**
 * 🛠️ GEMMASTER - UTILS MODULE
 * Logic for response parsing, tag cleaning, and tactical card generation.
 */

const Utils = {
    formatAIResponse(text, party = []) {
        let reasoningText = '';
        let narrativeText = '';

        // 1. EXTRACTION DU RAISONNEMENT
        const startTag = '<reasoning>';
        const endTag = '</reasoning>';
        const startIndex = text.indexOf(startTag);
        const endIndex = text.indexOf(endTag);

        if (startIndex !== -1) {
            if (endIndex !== -1) {
                reasoningText = text.substring(startIndex + startTag.length, endIndex).trim();
                narrativeText = text.substring(endIndex + endTag.length).trim();
            } else {
                reasoningText = text.substring(startIndex + startTag.length).trim();
                narrativeText = '';
            }
        } else {
            narrativeText = text.trim();
        }

        // Nettoyage interne du raisonnement
        reasoningText = reasoningText.replace(/(LOGIC|TAGS|INTERNAL VOICE|INNER VOICE|OMNISCIENT WHISPER|STRATEGY|TURN_COUNT|DANGER LEVEL|CONTEXT|BEAT|STATE)[\s:]*/gim, '').trim();

        // 2. NETTOYAGE DE LA NARRATION (On garde NPC et CHECK pour le rendu visuel plus tard)
        let cleanNarrative = narrativeText
            .replace(/\*?\*?\[{1,2}(OPTIONS|INTERRUPTS|SOUND|AMBIANCE|SKILL|GEMMA GUARD)[:\s]*[\s\S]*?\]{1,2}\*?\*?/gi, '')
            .replace(/\*?\*?(THE\s+)?NARRATION[\s:]*\*?\*?\s*/gim, '')
            .replace(/\*?\*?(THE\s+)?(OMNISCIENT\s+)?WHISPER[\s:]*\*?\*?\s*/gim, '')
            .replace(/\*?\*?(THE\s+)?STRATEGY[\s:]*\*?\*?\s*/gim, '')
            .trim();

        // Suppression des caractères parasites au début
        cleanNarrative = cleanNarrative.replace(/^[:\-\s>]+/, '').trim();

        // 3. ASSEMBLAGE FINAL
        let finalHtml = '';
        
        if (reasoningText) {
            const renderedReasoning = window.marked ? window.marked.parse(reasoningText) : reasoningText;
            finalHtml += `
            <div class="inner-voice-container">
                <div class="inner-voice-label">VOIX OFF</div>
                <div class="inner-voice-content">${renderedReasoning}</div>
            </div>`;
        }

        if (cleanNarrative) {
            // Render Markdown first
            let renderedNarrative = window.marked ? window.marked.parse(cleanNarrative) : cleanNarrative;

            // 4. RENDU DES COMPOSANTS TACTIQUES (Sur l'HTML généré)
            
            // Jets de dés
            const diceRegex = /\[{2}CHECK:\s*(.*?),\s*(.*?)\]{2}/gi;
            renderedNarrative = renderedNarrative.replace(diceRegex, (match, stat, dc) => {
                // Rendre le jet déterministe pour éviter le clignotement pendant le stream
                const seed = stat + dc;
                let hash = 0;
                for (let i = 0; i < seed.length; i++) {
                    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                    hash |= 0;
                }
                const roll = (Math.abs(hash) % 20) + 1;
                
                // Récupérer le bonus du personnage (Stats réelles)
                let statBonus = 0;
                const statKey = stat.toLowerCase().trim();
                const hero = party && party.length > 0 ? party[0] : null;
                if (hero && hero.stats) {
                    statBonus = hero.stats[statKey] || 0;
                }

                const total = roll + statBonus;
                const cleanDC = dc.replace(/DC/gi, '').trim();
                const targetDC = parseInt(cleanDC) || 12;
                const success = total >= targetDC; 

                return `
                <div class="tactical-dice-card ${success ? 'success' : 'failure'}">
                    <div class="dice-side">
                        <div class="dice-number">${total}</div>
                        <div class="dice-label">TOTAL</div>
                    </div>
                    <div class="dice-content">
                        <div class="dice-header">
                            <span class="dice-stat">${stat.toUpperCase()} CHECK</span>
                            <span class="dice-dc">DC ${cleanDC}</span>
                        </div>
                        <div class="dice-math">Dé (${roll}) + ${stat} (${statBonus})</div>
                        <div class="dice-status-badge">${success ? 'SUCCESS' : 'FAILURE'}</div>
                    </div>
                </div>`;
            });

            // NPC Header & Dialogue Style
            const npcRegex = /\[{2}NPC:\s*(.*?),\s*(.*?)\]{2}/gi;
            renderedNarrative = renderedNarrative.replace(npcRegex, (match, name, mood) => {
                // Déclencher l'ambilight sur l'humeur
                if (window.UI && window.UI.shiftColors) {
                    window.UI.shiftColors(mood.trim().toUpperCase());
                }

                return `
                <div class="npc-dialogue-block">
                    <div class="npc-name-badge">${name.trim().toUpperCase()}</div>
                    <div class="npc-quote">`;
            });
            
            // Close the quote block if opened
            if (renderedNarrative.includes('class="npc-quote">')) {
                renderedNarrative += '</div></div>';
            }

            // Loot Cards (ADD_ITEM)
            const itemRegex = /\[{2}ADD_ITEM:\s*(.*?),\s*(.*?)\]{2}/gi;
            renderedNarrative = renderedNarrative.replace(itemRegex, (match, name, img) => {
                const itemPath = img.includes('/') ? img : `/static/assets/items/${img.trim()}`;
                return `
                <div class="loot-card">
                    <img src="${itemPath}" class="loot-icon" alt="${name}">
                    <div class="loot-info">
                        <div class="loot-label">ITEM DÉCOUVERT</div>
                        <div class="loot-name">${name.trim()}</div>
                    </div>
                </div>`;
            });

            finalHtml += `<div class="narrative-body">${renderedNarrative}</div>`;
        }

        return finalHtml;
    }
};

window.Utils = Utils;
