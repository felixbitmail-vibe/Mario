import Phaser from 'phaser';

const GAP = 16;
const DPAD_BTN_W = 58;
const DPAD_BTN_H = 58;
const ACTION_RADIUS = 42;
const HIT_PADDING = 8;
const DEPTH_ZONE = 1999;
const DEPTH_GRAPHICS = 2000;
const DEPTH_LABEL = 2001;

function isMobileLike(game: Phaser.Game): boolean {
    const touch = game.device.input.touch;
    const w = game.scale.width;
    return touch || w <= 600;
}

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

        const fontSize = Math.max(13, Math.min(16, w / 32));
        const moveY = h - GAP - DPAD_BTN_H / 2 - 6;
        const actionY = h - GAP - ACTION_RADIUS - 6;

        const leftX = GAP + DPAD_BTN_W / 2 + 6;
        const rightX = GAP + DPAD_BTN_W * 1.5 + 16;
        const aX = w - GAP - ACTION_RADIUS * 2 - 16;
        const bX = w - GAP - ACTION_RADIUS;

        this.add.text(w / 2, h - GAP - DPAD_BTN_H - 24, 'Styring', {
            fontSize: `${fontSize}px`,
            color: '#fff',
            fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);

        const g = this.add.graphics().setScrollFactor(0).setDepth(DEPTH_GRAPHICS);

        g.fillStyle(0x333333, 0.92);
        g.lineStyle(3, 0x555555, 1);
        g.fillRoundedRect(leftX - DPAD_BTN_W / 2, moveY - DPAD_BTN_H / 2, DPAD_BTN_W, DPAD_BTN_H, 12);
        g.strokeRoundedRect(leftX - DPAD_BTN_W / 2, moveY - DPAD_BTN_H / 2, DPAD_BTN_W, DPAD_BTN_H, 12);
        g.fillStyle(0x444444, 0.98);
        g.fillRoundedRect(leftX - DPAD_BTN_W / 2 + 3, moveY - DPAD_BTN_H / 2 + 3, DPAD_BTN_W - 6, DPAD_BTN_H - 6, 10);
        this.add.text(leftX, moveY, '◀', { fontSize: '26px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);

        g.fillStyle(0x333333, 0.92);
        g.lineStyle(3, 0x555555, 1);
        g.fillRoundedRect(rightX - DPAD_BTN_W / 2, moveY - DPAD_BTN_H / 2, DPAD_BTN_W, DPAD_BTN_H, 12);
        g.strokeRoundedRect(rightX - DPAD_BTN_W / 2, moveY - DPAD_BTN_H / 2, DPAD_BTN_W, DPAD_BTN_H, 12);
        g.fillStyle(0x444444, 0.98);
        g.fillRoundedRect(rightX - DPAD_BTN_W / 2 + 3, moveY - DPAD_BTN_H / 2 + 3, DPAD_BTN_W - 6, DPAD_BTN_H - 6, 10);
        this.add.text(rightX, moveY, '▶', { fontSize: '26px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);

        g.fillStyle(0x2d5016, 0.98);
        g.lineStyle(3, 0x4a7c23, 1);
        g.fillCircle(aX, actionY, ACTION_RADIUS - 2);
        g.strokeCircle(aX, actionY, ACTION_RADIUS - 2);
        g.fillStyle(0x3d6b1a, 0.95);
        g.fillCircle(aX - 2, actionY - 2, ACTION_RADIUS - 10);
        this.add.text(aX, actionY, 'A', { fontSize: '22px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);
        this.add.text(aX, actionY + ACTION_RADIUS + 12, 'Hop', { fontSize: `${fontSize - 1}px`, color: '#b8d4a0' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);

        g.fillStyle(0x8b4513, 0.98);
        g.lineStyle(3, 0xa0522d, 1);
        g.fillCircle(bX, actionY, ACTION_RADIUS - 2);
        g.strokeCircle(bX, actionY, ACTION_RADIUS - 2);
        g.fillStyle(0x9b5523, 0.95);
        g.fillCircle(bX - 2, actionY - 2, ACTION_RADIUS - 10);
        this.add.text(bX, actionY, 'B', { fontSize: '22px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);
        this.add.text(bX, actionY + ACTION_RADIUS + 12, 'Løb', { fontSize: `${fontSize - 1}px`, color: '#e8c4a0' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_LABEL);

        const hitW = DPAD_BTN_W + HIT_PADDING * 2;
        const hitH = DPAD_BTN_H + HIT_PADDING * 2;
        const actionHit = (ACTION_RADIUS * 2) + HIT_PADDING * 2;

        this.leftBtn = this.add.zone(leftX, moveY, hitW, hitH).setInteractive({ useHandCursor: false }).setScrollFactor(0).setDepth(DEPTH_ZONE);
        this.rightBtn = this.add.zone(rightX, moveY, hitW, hitH).setInteractive({ useHandCursor: false }).setScrollFactor(0).setDepth(DEPTH_ZONE);
        this.aBtn = this.add.zone(aX, actionY, actionHit, actionHit).setInteractive({ useHandCursor: false }).setScrollFactor(0).setDepth(DEPTH_ZONE);
        this.bBtn = this.add.zone(bX, actionY, actionHit, actionHit).setInteractive({ useHandCursor: false }).setScrollFactor(0).setDepth(DEPTH_ZONE);

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

        if (!isMobileLike(this.sys.game)) {
            this.scene.setVisible(false);
            this.leftBtn.disableInteractive();
            this.rightBtn.disableInteractive();
            this.aBtn.disableInteractive();
            this.bBtn.disableInteractive();
        }
    }
}
