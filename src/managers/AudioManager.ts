import Phaser from 'phaser';
export default class AudioManager {
    private static instance: AudioManager;
    private music?: Phaser.Sound.BaseSound;
    constructor(private scene: Phaser.Scene) {}
    public static init(scene: Phaser.Scene) { this.instance = new AudioManager(scene); }
    public static playMusic(key: string, loop = true) {
        if (this.instance.music) this.instance.music.stop();
        this.instance.music = this.instance.scene.sound.add(key, { loop, volume: 0.5 });
        this.instance.music.play();
    }
    public static playMusicOnce(key: string) {
        this.playMusic(key, false);
    }
    public static playSFX(key: string) {
        this.instance.scene.sound.play(key);
    }
}
