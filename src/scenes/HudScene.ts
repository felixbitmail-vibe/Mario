import Phaser from 'phaser';

const HUD_PADDING = 12;
const FONT_SIZE = 18;

export default class HudScene extends Phaser.Scene {
    private scoreText!: Phaser.GameObjects.Text;
    private coinsText!: Phaser.GameObjects.Text;
    private timeText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'HudScene' });
    }

    create(): void {
        const style: Phaser.Types.GameObjects.Text.TextStyle = {
            fontSize: `${FONT_SIZE}px`,
            color: '#ffffff',
            backgroundColor: '#00000088',
            padding: { left: 8, right: 8, top: 4, bottom: 4 },
        };

        this.scoreText = this.add.text(HUD_PADDING, HUD_PADDING, 'Score: 0', style).setScrollFactor(0).setDepth(1000);
        this.coinsText = this.add.text(this.scale.width / 2 - 60, HUD_PADDING, 'Mønter: 0', style).setScrollFactor(0).setDepth(1000);
        this.timeText = this.add.text(this.scale.width - 120, HUD_PADDING, 'Tid: 300', style).setScrollFactor(0).setDepth(1000);
    }

    update(): void {
        const score = this.registry.get('score') as number | undefined;
        const coins = this.registry.get('coins') as number | undefined;
        const time = this.registry.get('time') as number | undefined;

        if (score !== undefined) this.scoreText.setText('Score: ' + score);
        if (coins !== undefined) this.coinsText.setText('Mønter: ' + coins);
        if (time !== undefined) this.timeText.setText('Tid: ' + Math.max(0, Math.floor(time)));
    }
}
