// stream_parser.js
// Handles real-time parsing of LLM stream tags to decouple logic from UI state.

window.StreamParser = {
    processTriggers(context, fullText) {
        // Ambiance / Sound (Robust matching)
        const ambianceMatches = Array.from(fullText.matchAll(/\[\[(AMBIANCE|SOUND):\s*(.*?)\]\]/gi));
        ambianceMatches.forEach(match => {
            const tag = match[0];
            const type = match[1].toUpperCase();
            const value = match[2].trim().toUpperCase();
            
            if (!window.processedSkills.has(tag)) {
                console.log(`🎬 Triggering ${type}: ${value}`);
                if (type === 'AMBIANCE' && window.UI && window.UI.shiftColors) {
                    window.UI.shiftColors(value);
                }
                if (type === 'SOUND') console.log("🔊 Sound Trigger:", value);
                window.processedSkills.add(tag);
            }
        });

        // QTE
        const qteMatch = fullText.match(/\[\[SKILL: QTE,\s*(.*?),\s*(.*?)\]\]/i);
        if (qteMatch && !context.qte.active && !window.processedSkills.has(qteMatch[0])) {
            window.processedSkills.add(qteMatch[0]);
            const seq = qteMatch[1].toUpperCase().replace(/[^WASD]/g, '').substring(0,4).split('');
            context.startQTE(seq, parseInt(qteMatch[2]) || 5);
        }

        // Items / Loot
        const itemMatch = fullText.match(/\[\[ADD_ITEM:\s*(.*?),\s*(.*?)\]\]/i);
        if (itemMatch && !window.processedSkills.has('ITEM_' + itemMatch[0])) {
            const itemName = itemMatch[1].trim();
            const itemImg = itemMatch[2].trim();
            context.inventory.push({ name: itemName, image: itemImg });
            if (window.API && window.API.saveInventory) window.API.saveInventory(context.inventory);
            window.processedSkills.add('ITEM_' + itemMatch[0]);
        }

        // Danger Level (Combat)
        const dangerMatch = fullText.match(/\[\[DANGER:\s*([\+\-]?\d+)\]\]/i);
        if (dangerMatch) {
            const val = parseInt(dangerMatch[1]);
            if (dangerMatch[1].startsWith('+') || dangerMatch[1].startsWith('-')) {
                context.dangerLevel = Math.max(0, Math.min(100, context.dangerLevel + val));
            } else {
                context.dangerLevel = Math.max(0, Math.min(100, val));
            }
            if (context.dangerLevel >= 75 && window.UI && window.UI.shiftColors) {
                window.UI.shiftColors('DANGER');
            }
        }

        // COMBAT
        const combatMatch = fullText.match(/\[\[SKILL: COMBAT,\s*(.*?)\]\]/i);
        if (combatMatch && !window.processedSkills.has(combatMatch[0])) {
            window.processedSkills.add(combatMatch[0]);
            context.placeholder = "Combat initiated! Choose your tactical action...";
        }

        // VISION
        const visionMatch = fullText.match(/\[\[SKILL: VISION,\s*(.*?)\]\]/i);
        if (visionMatch && !context.visionQuest.active && !window.processedSkills.has(visionMatch[0])) {
            window.processedSkills.add(visionMatch[0]);
            context.visionQuest.active = true;
            context.visionQuest.description = visionMatch[1].trim();
            context.placeholder = "👁️ Vision quest active...";
        }

        // INTERRUPTS
        const intMatches = Array.from(fullText.matchAll(/\*?\*?\[{2}INTERRUPTS?:\s*([\s\S]*?)\]{2}\*?\*?/gi));
        if (intMatches.length > 0) {
            let allInts = [];
            intMatches.forEach(match => {
                const tagContent = match[1].trim();
                let rawItems = tagContent.split(',').map(s => s.trim()).filter(s => s.length > 0);
                
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
                    let cleanItem = i.replace(/\[.*?\]/g, '').replace(/\*/g, '').trim();
                    const p = cleanItem.split('|').map(s => s.trim());
                    if (p.length === 1) {
                        const itemText = p[0];
                        const iconMatch = itemText.match(/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])\s*(.*)$/);
                        if (iconMatch && iconMatch[2]) return { icon: iconMatch[1], label: iconMatch[2].toUpperCase(), action: iconMatch[2] };
                        if (iconMatch) return null;
                        return { icon: '👉', label: itemText.toUpperCase(), action: itemText };
                    }
                    return { icon: p[0]||'👉', label: (p[1]||p[0]).toUpperCase(), action: p[2]||p[1]||p[0] };
                }).filter(x => x !== null);
                allInts = allInts.concat(parts);
            });
            context.interrupts = allInts.slice(0, 3);
        }

        // OPTIONS
        const optMatches = Array.from(fullText.matchAll(/\*?\*?\[{1,2}OPTIONS?[:\s]*([\s\S]*?)(?:\]{1,2}|$)/gi));
        if (optMatches.length > 0) {
            let allOpts = [];
            optMatches.forEach(match => {
                const tagContent = match[1].trim();
                if (!tagContent) return;
                let rawItems = tagContent.split(',').map(s => s.trim()).filter(s => s.length > 0);
                
                if (rawItems.length === 1 && (rawItems[0].match(/\|/g) || []).length > 2) {
                    const pipes = rawItems[0].split('|').map(s => s.trim());
                    if (pipes.length >= 6) {
                        rawItems = [];
                        for(let k=0; k<pipes.length; k+=3) rawItems.push(`${pipes[k]}|${pipes[k+1]||''}|${pipes[k+2]||''}`);
                    } else {
                        rawItems = pipes;
                    }
                }
                
                const parts = rawItems.map(i => {
                    let cleanItem = i.replace(/\[.*?\]/g, '').replace(/\*/g, '').trim();
                    if (!cleanItem) return null;
                    const p = cleanItem.split('|').map(s => s.trim());
                    if (p.length === 1) {
                        const itemText = p[0];
                        const iconMatch = itemText.match(/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])\s*(.*)$/);
                        if (iconMatch && iconMatch[2]) return { icon: iconMatch[1], label: iconMatch[2].toUpperCase(), action: iconMatch[2] };
                        return { icon: '👉', label: itemText.toUpperCase(), action: itemText };
                    }
                    return { icon: p[0]||'👉', label: (p[1]||p[0]).toUpperCase(), action: p[2]||p[1]||p[0] };
                }).filter(x => x !== null);
                allOpts = allOpts.concat(parts);
            });
            context.options = allOpts.slice(0, 3);
        }
    }
};
