/**
 * 🌐 GEMMASTER - API MODULE
 * Handles all communications with the backend.
 */

const API = {
    async fetchParty() {
        const res = await fetch('/party');
        return res.json();
    },

    async fetchJournal() {
        const res = await fetch('/journal');
        return res.json();
    },

    async fetchInventory() {
        const res = await fetch('/inventory');
        return res.json();
    },

    async saveInventory(items) {
        return fetch('/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items)
        });
    },

    async setupGame(config) {
        return fetch('/setup_game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
    },

    async getCharacterOptions() {
        const res = await fetch('/init_game');
        return res.json();
    },

    async selectCharacter(char) {
        return fetch('/select_character', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(char)
        });
    },

    async reset() {
        return fetch('/reset', { method: 'POST' });
    },

    async chat(message, images = [], turnCount = 0, signal = null) {
        return fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, images, turnCount }),
            signal
        });
    },

    async fetchModels() {
        const res = await fetch('/ollama_models');
        return res.json();
    },

    async getEngineStatus() {
        const res = await fetch('/engine_status');
        return res.json();
    }
};

window.API = API;
