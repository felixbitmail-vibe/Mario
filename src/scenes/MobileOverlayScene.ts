import Phaser from 'phaser';

const GAP = 20;
const DPAD_BTN_W = 52;
const DPAD_BTN_H = 52;
const ACTION_RADIUS = 36;
const DEPTH_ZONE = 1999;
const DEPTH_GRAPHICS = 2000;
const DEPTH_LABEL = 2001;

export default class MobileOverlayScene extends Phaser.Scene {
    private leftBtn!: Phaser.GameObjects.Zone;
    private rightBtn!: Phaser.GameObjects.Zone;
    private aBtn!: Phaser.GameObjects.Zone;
    private bBtn!: Phaser.GameObjects.Zone;

    constructor() {
        super({ key: 'MobileOverlayScene' });
    }

    create(): void {
        this.registry.set('inputLeft', false);
        this.registry.set('inputRight', false);
        this.registry.set('inputJump', false);
        this.registry.set('inputRun', false);

        const h = this.scale.height;
        const w = this.scale.width;

        const fontSize = Math.max(12, Math.min(14, w / 36));
        const moveY = h - GAP - DPAD_BTN_H / 2 - 8;
        const actionY = h - GAP - ACTION_RADIUS - 8;

        const leftX = GAP + DPAD_BTN_W / 2 + 4;
        const rightX = GAP + DPAD_BTN_W * 1.5 + 12;
        const aX = w - GAP - ACTION_RADIUS * 2 - 12;
        const bX = w - GAP - ACTION_RADIUS;

        this.add.text(w / 2, h - GAP - DPAD_BTN_H - 28, 'Kontroller', {
            fontSize: `${fontSize}px`,
            color: '#fff',
            fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);

        const g = this.add.graphics().setScrollFactor(0).setDepth(DEPTH_GRAPHICS);

        g.fillStyle(0x333333, 0.9);
        g.lineStyle(3, 0x555555, 1);
        g.fillRoundedRect(leftX - DPAD_BTN_W / 2, moveY - DPAD_BTN_H / 2, DPAD_BTN_W, DPAD_BTN_H, 10);
        g.strokeRoundedRect(leftX - DPAD_BTN_W / 2, moveY - DPAD_BTN_H / 2, DPAD_BTN_W, DPAD_BTN_H, 10);
        g.fillStyle(0x444444, 0.95);
        g.fillRoundedRect(leftX - DPAD_BTN_W / 2 + 2, moveY - DPAD_BTN_H / 2 + 2, DPAD_BTN_W - 4, DPAD_BTN_H - 4, 8);
        this.add.text(leftX, moveY, '◀', { fontSize: '22px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);

        g.fillStyle(0x333333, 0.9);
        g.lineStyle(3, 0x555555, 1);
        g.fillRoundedRect(rightX - DPAD_BTN_W / 2, moveY - DPAD_BTN_H / 2, DPAD_BTN_W, DPAD_BTN_H, 10);
        g.strokeRoundedRect(rightX - DPAD_BTN_W / 2, moveY - DPAD_BTN_H / 2, DPAD_BTN_W, DPAD_BTN_H, 10);
        g.fillStyle(0x444444, 0.95);
        g.fillRoundedRect(rightX - DPAD_BTN_W / 2 + 2, moveY - DPAD_BTN_H / 2 + 2, DPAD_BTN_W - 4, DPAD_BTN_H - 4, 8);
        this.add.text(rightX, moveY, '▶', { fontSize: '22px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);

        g.fillStyle(0x2d5016, 0.95);
        g.lineStyle(3, 0x4a7c23, 1);
        g.fillCircle(aX, actionY, ACTION_RADIUS - 2);
        g.strokeCircle(aX, actionY, ACTION_RADIUS - 2);
        g.fillStyle(0x3d6b1a, 0.9);
        g.fillCircle(aX - 2, actionY - 2, ACTION_RADIUS - 8);
        this.add.text(aX, actionY, 'A', { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);
        this.add.text(aX, actionY + ACTION_RADIUS + 10, 'Hop', { fontSize: `${fontSize - 2}px`, color: '#b8d4a0' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);

        g.fillStyle(0x8b4513, 0.95);
        g.lineStyle(3, 0xa0522d, 1);
        g.fillCircle(bX, actionY, ACTION_RADIUS - 2);
        g.strokeCircle(bX, actionY, ACTION_RADIUS - 2);
        g.fillStyle(0x9b5523, 0.9);
        g.fillCircle(bX - 2, actionY - 2, ACTION_RADIUS - 8);
        this.add.text(bX, actionY, 'B', { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);
        this.add.text(bX, actionY + ACTION_RADIUS + 10, 'Løb', { fontSize: `${fontSize - 2}px`, color: '#e8c4a0' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);

        this.leftBtn = this.add.zone(leftX, moveY, DPAD_BTN_W, DPAD_BTN_H).setInteractive({ useHandCursor: false }).setScrollFactor(0).setDepth(DEPTH_ZONE);
        this.rightBtn = this.add.zone(rightX, moveY, DPAD_BTN_W, DPAD_BTN_H).setInteractive({ useHandCursor: false }).setScrollFactor(0).setDepth(DEPTH_ZONE);
        this.aBtn = this.add.zone(aX, actionY, ACTION_RADIUS * 2, ACTION_RADIUS * 2).setInteractive({ useHandCursor: false }).setScrollFactor(0).setDepth(DEPTH_ZONE);
        this.bBtn = this.add.zone(bX, actionY, ACTION_RADIUS * 2, ACTION_RADIUS * 2).setInteractive({ useHandCursor: false }).setScrollFactor(0).setDepth(DEPTH_ZONE);

        const setReg = (key: string, value: boolean) => () => this.registry.set(key, value);

        this.leftBtn.on('pointerdown', setReg('inputLeft', true));
        this.leftBtn.on('pointerup', setReg('inputLeft', false));
        this.leftBtn.on('pointerout', setReg('inputLeft', false));

        this.rightBtn.on('pointerdown', setReg('inputRight', true));
        this.rightBtn.on('pointerup', setReg('inputRight', false));
        this.rightBtn.on('pointerout', setReg('inputRight', false));

        this.aBtn.on('pointerdown', setReg('inputJump', true));
        this.aBtn.on('pointerup', setReg('inputJump', false));
        this.aBtn.on('pointerout', setReg('inputJump', false));

        this.bBtn.on('pointerdown', setReg('inputRun', true));
        this.bBtn.on('pointerup', setReg('inputRun', false));
        this.bBtn.on('pointerout', setReg('inputRun', false));

        if (!this.sys.game.device.input.touch) {
            this.scene.setVisible(false);
            this.leftBtn.disableInteractive();
            this.rightBtn.disableInteractive();
            this.aBtn.disableInteractive();
            this.bBtn.disableInteractive();
        }
    }
}
