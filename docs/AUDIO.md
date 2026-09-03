# 音楽制作

## メニューBGM「遙かなる進軍」

ゲーム向けに新規作曲した、約65.5秒のシームレスループです。88 BPM、ニ短調を基調とした五音音階で、静かな旅立ちから戦線の高揚、次のループへ戻る余韻までを24小節で構成しています。

- DAW: LMMS 1.2.2
- 音源: GeneralUser GS v1.471 SoundFont
- 編成: 箏、尺八、三味線、太鼓、弦、笙風パッド、コントラバス、ホルン
- 配信用音源: `src/assets/audio/jidai-adventure.ogg`（48 kHz / stereo / Ogg Vorbis）
- 編集用データ: `asset/audio/source/jidai-adventure.mmp`
- MIDI: `asset/audio/source/jidai-adventure.mid`

## 時代別の戦闘BGM

メニュー曲の主題を引き継ぎながら、テンポ・調・編成を時代ごとに変えています。進化すると約0.5秒のクロスフェードで次の曲へ移ります。

| 時代 | 曲名       | BPM | 主な音色                                 |
| ---- | ---------- | --: | ---------------------------------------- |
| 原始 | 大地の鼓動 |  72 | 低い和太鼓、木打音、素朴な竹笛           |
| 古代 | 天平の風   |  80 | 箏、尺八、笙風の持続音                   |
| 中世 | 武門の旗   |  88 | 箏、尺八、太鼓、低弦、角笛               |
| 近世 | 城下疾走   |  98 | 三味線、太鼓、弦、角笛                   |
| 近代 | 維新行進   | 104 | ピアノ、管弦楽、ティンパニ、トランペット |
| 現代 | 情報戦線   | 112 | 電子リード、シンセパッド、シンセベース   |

編集用データとSoundFontは容量が大きいため配布ビルドには含めず、完成した7本のOGGだけを同梱します。OGGが読み込めない環境では、既存のWeb Audio版BGMへ自動的に切り替わります。

## 再生成

GeneralUser GS v1.471のSoundFontを用意した後、次のコマンドでLMMSプロジェクトとMIDIを生成できます。

```powershell
node scripts/build-adventure-bgm.mjs "asset/audio/GeneralUser-GS-1.471/GeneralUser GS v1.471.sf2"
node scripts/build-era-bgm.mjs
```

生成した`.mmp`をLMMSで開き、48 kHz・ステレオで書き出します。最終OGGは約-18 LUFSを基準にし、ゲーム効果音のためのヘッドルームを残しています。

## 音源ライセンス

GeneralUser GSはS. Christian Collins氏によるSoundFontです。音源のライセンスは、音源を使用して作った音楽の私用・商用利用を認めています。SoundFont本体はゲームに同梱していません。ライセンス原文は[GeneralUser GS LICENSE](https://github.com/ROCKNIX/generaluser-gs/blob/main/LICENSE.txt)を参照してください。
