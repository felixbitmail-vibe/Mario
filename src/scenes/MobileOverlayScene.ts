import Phaser from 'phaser';

const BTN_SIZE = 56;
const BTN_ALPHA = 0.35;
const GAP = 24;

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

        const leftX = GAP + BTN_SIZE / 2;
        const rightX = GAP + BTN_SIZE * 1.5 + 16;
        const moveY = h - GAP - BTN_SIZE / 2;

        const aX = w - GAP - BTN_SIZE * 1.5 - 16;
        const bX = w - GAP - BTN_SIZE / 2;
        const actionY = h - GAP - BTN_SIZE / 2;

        const makeBtn = (x: number, y: number, label: string) => {
            const bg = this.add.rectangle(x, y, BTN_SIZE, BTN_SIZE, 0xffffff, BTN_ALPHA).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(2000);
            const text = this.add.text(x, y, label, { fontSize: '18px', color: '#000' }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
            const zone = this.add.zone(x, y, BTN_SIZE, BTN_SIZE).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(1999);
            return { zone, bg, text };
        };

        const left = makeBtn(leftX, moveY, '◀');
        this.leftBtn = left.zone;
        const right = makeBtn(rightX, moveY, '▶');
        this.rightBtn = right.zone;
        const a = makeBtn(aX, actionY, 'A');
        this.aBtn = a.zone;
        const b = makeBtn(bX, actionY, 'B');
        this.bBtn = b.zone;

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
        }
    }
}
