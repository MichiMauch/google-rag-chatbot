/**
 * Migration script to export chat configs from browser localStorage to filesystem
 *
 * Usage:
 * 1. Open browser console on https://rag.mauch.rocks
 * 2. Run this code:
 *
 * const configs = {};
 * for (let i = 0; i < localStorage.length; i++) {
 *   const key = localStorage.key(i);
 *   if (key && key.startsWith('chat-config-')) {
 *     const chatName = key.replace('chat-config-', '');
 *     configs[chatName] = JSON.parse(localStorage.getItem(key));
 *   }
 * }
 * console.log(JSON.stringify(configs, null, 2));
 *
 * 3. Copy the output
 * 4. Save each config to data/chat-configs/{chatName}.json
 */

export {};
