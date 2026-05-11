/**
 * 🎨 GEMMASTER - UI HELPERS
 * DOM manipulation, animations, and message rendering.
 */

const UI = {
    scrollBottom(force = false) {
        const scrollArea = document.getElementById('main-scroll');
        if (scrollArea) {
            // Check if we are already near the bottom (threshold of 50px for better sensitivity)
            const threshold = 50;
            const isAtBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight < threshold;

            // If user manually scrolled up, we don't auto-scroll unless forced
            if (window.userHasScrolled && !force && !isAtBottom) {
                return;
            }

            if (force || isAtBottom) {
                // If we are at the bottom, reset the manual scroll flag
                if (isAtBottom) window.userHasScrolled = false;
                
                scrollArea.scrollTo({
                    top: scrollArea.scrollHeight,
                    behavior: force ? 'smooth' : 'auto'
                });
            }
        }
    },

    shiftColors(mood = null) {
        const palettes = {
            'ACTION': ['#f57233', '#ef4444'],
            'MYSTERY': ['#3372f5', '#8b5cf6'],
            'TENSION': ['#1e293b', '#3372f5'],
            'RAIN': ['#10b981', '#3372f5'],
            'CALM': ['#3372f5', '#06b6d4'],
            'DANGER': ['#ef4444', '#b91c1c'],
            'DEFAULT': ['#3372f5', '#8b5cf6']
        };
        
        const pair = palettes[mood?.toUpperCase()] || palettes['DEFAULT'];
        document.documentElement.style.setProperty('--blob-1-color', pair[0]);
        document.documentElement.style.setProperty('--blob-2-color', pair[1]);
    },

    addMessage(content, role, imageUrl = null, party = []) {
        const chat = document.getElementById('chat-history');
        const div = document.createElement('div');
        div.className = `message ${role}`;
        
        if (role === 'ai') {
            const html = window.Utils.formatAIResponse(content, party);
            div.innerHTML = `<div class="message-body-container">${html}</div>`;
        } else {
            let html = `<div class="user-bubble"><span class="user-text">${content}</span></div>`;
            if (imageUrl) {
                html += `<div class="user-image"><img src="${imageUrl}"></div>`;
            }
            div.innerHTML = html;
        }
        
        chat.appendChild(div);
        this.scrollBottom(true); 
        return div;
    },

    updateAIMessage(div, content) {
        if (!div) return;
        
        // Throttling: Avoid re-parsing the entire markdown for every single character
        // We only allow one full render every 64ms (~15fps during streaming is plenty)
        const now = Date.now();
        if (div._lastRender && (now - div._lastRender < 64)) {
            // Still, we want to update at the very end of the stream, 
            // so we set a small timeout that will be cleared if a new chunk arrives
            if (div._renderTimeout) clearTimeout(div._renderTimeout);
            div._renderTimeout = setTimeout(() => this.updateAIMessage(div, content), 70);
            return;
        }
        div._lastRender = now;

        requestAnimationFrame(() => {
            const html = window.Utils.formatAIResponse(content);
            const bodyContainer = div.querySelector('.message-body-container');
            
            if (!bodyContainer) {
                div.innerHTML = `<div class="message-body-container">${html}</div>`;
            } else if (bodyContainer.innerHTML !== html) {
                bodyContainer.innerHTML = html;
            }
            
            this.scrollBottom();
        });
    }
};

// Initialize Smart Scroll Listener
document.addEventListener('DOMContentLoaded', () => {
    const scrollArea = document.getElementById('main-scroll');
    if (scrollArea) {
        scrollArea.addEventListener('scroll', () => {
            const threshold = 50;
            const isAtBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight < threshold;
            
            // If the user scrolls up, we set the flag
            if (!isAtBottom) {
                window.userHasScrolled = true;
            } else {
                // If they reach the bottom again, we release the lock
                window.userHasScrolled = false;
            }
        });
    }
});

window.UI = UI;
window.userHasScrolled = false;
