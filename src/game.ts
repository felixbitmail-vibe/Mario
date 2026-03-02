import Phaser from 'phaser';
import MainScene from './scenes/MainScene';
import HudScene from './scenes/HudScene';
import MobileOverlayScene from './scenes/MobileOverlayScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 512,
    height: 240,
    parent: 'app',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [MainScene, HudScene, MobileOverlayScene],
};

export default new Phaser.Game(config);
