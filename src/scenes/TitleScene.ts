import Phaser from 'phaser';

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    create(): void {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x5C94FC);

        this.add.text(w / 2, h * 0.3, 'Super Mario Bros.', {
            fontSize: '28px',
            color: '#fff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.add.text(w / 2, h * 0.55, 'Tryk ENTER eller klik for at starte', {
            fontSize: '16px',
            color: '#fff',
        }).setOrigin(0.5);

        this.add.text(w / 2, h * 0.75, '← → Bevæg  |  ↑ Hop  |  SHIFT Løb', {
            fontSize: '14px',
            color: '#eee',
        }).setOrigin(0.5);

        const start = () => {
            this.input.off('pointerdown', start);
            enterKey?.off('down', start);
            spaceKey?.off('down', start);
            this.scene.start('MainScene');
        };

        this.input.once('pointerdown', start);
        const enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        enterKey?.once('down', start);
        spaceKey?.once('down', start);
    }
}
