// // scripts/Halla/Halla/core/sound.js
// // Modul pro správu a přehrávání zvuků a hudby.
// 
// (function (global) {
//     "use strict";
//     var Halla = global.Halla = global.Halla || {};
// 
//     // Namespace pro zvuky
//     Halla.Sound = {};
// 
//     // Reference na přehrávače, aby je garbage collector nesmazal před dohráním.
//     var musicPlayer = null;
// 
//     /**
//      * Inicializace zvukového systému (aktuálně prázdná, pro budoucí použití).
//      */
//     Halla.Sound.init = function(parent) {};
// 
//     /**
//      * Přehraje krátký zvukový efekt (fire-and-forget).
//      * @param {string} soundName - Klíč zvuku z Halla.SOUNDS.
//      */
//     Halla.Sound.playEffect = function(soundName) {
//         // if (!Halla.SOUNDS || !Halla.SOUNDS[soundName]) return;
// 
//         // var soundPath = Halla.SOUNDS[soundName];
//         // soundPath = soundPath.replace(/\\/g, "/");
// 
//         // // Podle dokumentace Qt je pro krátké efekty ideální použít statickou metodu play().
//         // // Je to jednodušší a nemusíme spravovat instance objektů.
//         // QSound.play(soundPath);
//     };
// 
//     /**
//      * Spustí přehrávání hudby na pozadí (ve smyčce).
//      * @param {string} soundName - Klíč hudby z Halla.SOUNDS.
//      */
//     Halla.Sound.playMusic = function(soundName) {
//         // if (!Halla.SOUNDS || !Halla.SOUNDS[soundName]) return;
// 
//         // // Zastavíme předchozí hudbu, pokud hrála.
//         // Halla.Sound.stopMusic();
// 
//         // var soundPath = Halla.SOUNDS[soundName];
//         // soundPath = soundPath.replace(/\\/g, "/");
// 
//         // // Vytvoříme instanci pro hudbu a uložíme si ji.
//         // musicPlayer = new QSound(soundPath);
//         // musicPlayer.setLoops(QSound.Infinite); // Přehrávání ve smyčce.
//         // musicPlayer.play();
//     };
// 
//     /**
//      * Zastaví aktuálně přehrávanou hudbu.
//      */
//     Halla.Sound.stopMusic = function() {
//         // if (musicPlayer) {
//             // musicPlayer.stop();
//             // musicPlayer = null;
//         // }
//     };
// 
// })(this);