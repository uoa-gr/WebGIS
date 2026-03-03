/**
 * main.js - Application entry point.
 */

import UIController from './ui/UIController.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = new UIController();
    app.init().catch(err => {
        console.error('Application init failed:', err);
        document.body.innerHTML = `<h1>Failed to start. Check console.</h1>`;
    });
});
