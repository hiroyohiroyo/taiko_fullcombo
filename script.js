const genreColorMap = new Map();

/* 固定ジャンル色：これは曲タイトル（文字色）に適用されます */
const genreFixedColors = {
    'ポップス': '#49d5eb',
    'キッズ': '#fcd000',
    'アニメ': '#fe90d2',
    'ボーカロイド': '#C0C0C0',
    'ゲーム': '#cc8aeb',
    'バラエティ': '#0acc2a',
    'クラシック': '#ded523',
    'ナムコオリジナル': '#ff7028',
    '未設定': '#000000'
};

function genColorForGenre(name) {
    const key = (name || '').toString();
    if (genreColorMap.has(key)) return genreColorMap.get(key);
    const color = genreFixedColors[key] || '#000000';
    genreColorMap.set(key, color);
    return color;
}

function ingestCSVText(text) {
    const rows = parseCSV(text);
    if (rows.length === 0) return;
    // ヘッダーは小文字化してキーにする
    const header = rows[0].map(h => h.trim().toLowerCase());
    const data = rows.slice(1);
    clearBoard();
    const slotsContainer = document.getElementById('slotsContainer');
    const rankIds = [
        'F', 'E', 'D', '個人差C', 'C', 'C+', '個人差B', 'B', 'B+',
        '個人差A', 'A', 'A+', '個人差S', 'S', '個人差S+', 'S+', 'SS'
    ].reverse();

    const slotGrids = {};

    rankIds.forEach(rid => {
        const row = document.createElement('div');
        row.className = 'rankRow';

        const label = document.createElement('div');
        label.className = 'rankCell';
        label.textContent = rid;

        const grid = document.createElement('div');
        grid.className = 'songGrid';
        grid.id = 'slotGrid_' + rid;

        row.appendChild(label);
        row.appendChild(grid);

        slotsContainer.appendChild(row);

        slotGrids[rid] = grid;
    });

    let fullcomboCount = 0, clearCount = 0, notClearCount = 0;
    data.forEach(d => {
        const obj = {};
        d.forEach((v, i) => { obj[header[i]] = v.trim(); });
        const song = {
            title: obj.title || '',
            genre: obj.genre || '未設定',
            rank: obj.rank || obj.difficulty || 'F',
            status: convertStatus(obj.status || obj.completed || '0'),
            firstDate: obj.firstdate || obj['firstdate'] || ''
        };
        if (song.status === 'フルコンボ') fullcomboCount++;
        else if (song.status === 'クリア') clearCount++;
        else notClearCount++;
        const rid = mapRankToId(song.rank);
        placeSong(slotGrids[rid], song);
    });

    const total = data.length;
    const ratio = total > 0 ? ((fullcomboCount / total) * 100).toFixed(1) : 0;
    document.getElementById('summary').textContent =
        `読み込み曲数: ${total} 曲 — 未クリア: ${notClearCount} 曲 — クリア: ${clearCount} 曲 — フルコンボ: ${fullcomboCount} 曲 — フルコンボ割合: ${ratio}%`;

    const legend = document.getElementById('legend');
    genreColorMap.forEach((color, genre) => {
        const item = document.createElement('div'); item.className = 'item';
        const sw = document.createElement('span'); sw.className = 'swatch'; sw.style.background = color; sw.style.borderColor = '#aaa';
        const label = document.createElement('span'); label.textContent = genre;
        item.appendChild(sw); item.appendChild(label);
        legend.appendChild(item);
    });
}

function clearBoard() {
    document.getElementById('slotsContainer').innerHTML = '';
    document.getElementById('legend').innerHTML = '';
    document.getElementById('summary').textContent = '';
    genreColorMap.clear();
}
function parseCSV(text) {
    return text.split(/\r?\n/).filter(r => r.trim() !== '').map(r => r.split(','));
}
function mapRankToId(rank) {
    const r = String(rank || '').trim().toUpperCase();
    const validRanks = ['F', 'E', 'D', '個人差C', 'C', 'C+', '個人差B', 'B', 'B+', '個人差A', 'A', 'A+', '個人差S', 'S', '個人差S+', 'S+', 'SS'];
    return validRanks.includes(r) ? r : 'F';
}
function convertStatus(status) {
    const num = parseInt(status, 10);
    if (num === 0) return '未クリア';
    if (num === 1) return 'クリア';
    if (num === 2) return 'フルコンボ';
    return '未クリア';
}

function placeSong(slotGrid, song) {
    // wrapper を作る（デフォルトは白背景・黒枠）
    const wrapper = document.createElement('div');
    wrapper.className = 'songWrapper';

    // status による背景色上書き（クリア=薄緑、フルコンボ=薄黄）
    if (song.status === 'クリア') {
        wrapper.style.background = '#DAFADB'; // 薄緑
    } else if (song.status === 'フルコンボ') {
        wrapper.style.background = '#FADBDA';
    } else {
        wrapper.style.background = '#ffffff'; // デフォルト白
    }
    // 枠は黒
    wrapper.style.border = '1px solid #000';

    // タイトル要素（文字色=ジャンル色）
    const el = document.createElement('div');
    el.className = 'song';
    el.textContent = song.title;
    el.title = `${song.title} — ${song.genre} — ${song.status} — ${song.firstDate || ''}`;

    // ジャンルに応じた文字色（未設定は黒）
    const textColor = genColorForGenre(song.genre || '未設定');
    el.style.color = textColor;

    // もし文字色が白系で見えにくくなる場合は黒枠にする等は検討可
    wrapper.appendChild(el);
    slotGrid.appendChild(wrapper);
}

// document
document.getElementById('csvFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { ingestCSVText(ev.target.result); };
    reader.readAsText(file, 'utf-8');
});

document.getElementById('resetBtn').addEventListener('click', clearBoard);

document.getElementById('exportPdf').addEventListener('click', () => {
    const board = document.querySelector('.board');

    // 元の値を保存
    const originalHeight = board.style.height;
    const originalOverflow = board.style.overflow;

    // PDF用に一時書き換え
    board.style.height = 'auto';
    board.style.overflow = 'visible';

    const opt = {
        margin: 10,
        filename: 'taiko_star10_status.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf()
        .set(opt)
        .from(board)
        .save()
        .then(() => {
            board.style.height = originalHeight;
            board.style.overflow = originalOverflow;
        });
});

window.onload = () => {
    ingestCSVText(defaultCSV);
};

const defaultCSV = `
  title,genre,rank,status,firstDate
  Infinite Rebellion,ナムコオリジナル,SS,0,1
  Vixtory(裏),ナムコオリジナル,SS,1,
  彁(裏),ナムコオリジナル,SS,0,
  CRUXNAUT,ナムコオリジナル,SS,0,
  神竜Shinryu～(裏),ナムコオリジナル,SS,0,
  Central Dogma Pt.1(裏),ナムコオリジナル,SS,0,
  憎悪と酷悪の花束,ナムコオリジナル,SS,1,
  第六天魔王,ナムコオリジナル,SS,0,
  第六天魔王(裏),ナムコオリジナル,SS,0,
  ダーク・エクス・マキナ♡,ナムコオリジナル,SS,0,
  ダンガンノーツ(裏),ナムコオリジナル,SS,1,
  Destination 2F29,ナムコオリジナル,SS,0,
  ドンカマ2000,ナムコオリジナル,SS,0,
  23時54分、陽の旅路のプレリュード(裏),ナムコオリジナル,SS,0,
  VS. VIVGANGS(裏),ナムコオリジナル,SS,0,
  poxei◇DOON,ナムコオリジナル,SS,0,
  幽玄ノ乱,ナムコオリジナル,SS,0,
  
  
  アンリミテッドゲームズ(裏),ナムコオリジナル,S+,0,
  CUT! into the FUTURE(裏),ナムコオリジナル,S+,0,
  業・善なる神とこの世の悪について(裏),ゲーム,S+,0,
  The Future of the 太鼓ドラム(裏),ナムコオリジナル,S+,1,
  魑魅魍魎,ナムコオリジナル,S+,1,
  まださいたま2000,ナムコオリジナル,S+,1,
  
  
  Emma(裏)【達人固定】,ナムコオリジナル,個人差S+,1,
  !!!カオスタイム!!!,ナムコオリジナル,個人差S+,0,
  †††カオスタイム the DARK†††,ナムコオリジナル,個人差S+,0,
  狂乱怒涛(裏),ナムコオリジナル,個人差S+,0,
  トロいか2000,ナムコオリジナル,個人差S+,0,
  疾風怒濤(裏),ナムコオリジナル,個人差S+,0,
  双竜ノ乱,ナムコオリジナル,個人差S+,1,
  
  
  オペレート・ミー(裏),ナムコオリジナル,S,1,
  仮想現実のテレスコープ(裏),ナムコオリジナル,S,0,
  Calamity Fortune(裏),ナムコオリジナル,S,0,
  氷竜　～Kooryu～(裏),ナムコオリジナル,S,0,
  刻竜　～Kokuryu～(裏),ナムコオリジナル,S,0,
  Coquette,ナムコオリジナル,S,1,
  最果の魔法使い(裏),ナムコオリジナル,S,0,
  siren's eye,ナムコオリジナル,S,0,
  Synthesis(裏),ゲーム,S,0,
  続〆ドレー2000,ナムコオリジナル,S,1,
  そして勇者は眠りにつく(裏),ナムコオリジナル,S,1,
  !!!チルノのパーフェクトさんすうタイム!!!,バラエティ,S,0,
  チャーリーダッシュ！,クラシック,S,0,
  とける(裏),ナムコオリジナル,S,0,
  #MM,ナムコオリジナル,S,1,
  Hurtling Boys,ナムコオリジナル,S,,
  星屑ストラック(裏),ナムコオリジナル,S,1,
  POLARiSNUT,ナムコオリジナル,S,1,
  モノクロボイス(裏),ナムコオリジナル,S,1,
  4+1のそれぞれの未来(裏)【普通限定】,ボーカロイド,S,0,
  4+1のそれぞれの未来(裏)【玄人限定】,ボーカロイド,S,0,
  4+1のそれぞれの未来(裏)【達人限定】,ボーカロイド,S,0,
  Lightnig Boys(裏),ナムコオリジナル,S,0,
  L△chesis(裏),ナムコオリジナル,S,0,
  ラ・モレーナ・クモナイ(裏),ナムコオリジナル,S,0,
  
  
  Xα(裏),ナムコオリジナル,個人差S,1,
  Genesis Ray(裏),ゲーム,個人差S,0,
  スーハー2000,ナムコオリジナル,個人差S,1,
  たいこの2000,ナムコオリジナル,個人差S,1,
  Challengers,ナムコオリジナル,個人差S,1,
  Nosferatu(裏),ナムコオリジナル,個人差S,0,
  UFO Swingin',ナムコオリジナル,個人差S,0,
  わら得る2000,ナムコオリジナル,個人差S,0,
  
  
  あめふりのロンド(裏),ゲーム,A+,0,
  ouroboros - twin stroke of the end -,ゲーム,A+,0,
  ON SAY GO SAY(裏),ナムコオリジナル,A+,0,
  成仏2000,ナムコオリジナル,A+,1,
  森羅万象(達人譜面),ナムコオリジナル,A+,0,
  Central Dogma Pt.2,ナムコオリジナル,A+,1,
  Taiko Drum Monster(裏),ナムコオリジナル,A+,1,
  Dreadnought(裏),バラエティ,A+,0,
  幕末維新譚,ナムコオリジナル,A+,0,
  バチムチマッスルキングダム,ナムコオリジナル,A+,1,
  初音ミクの消失-劇場版-(裏),ボーカロイド,A+,1,
  Hello Worldoood!!,ナムコオリジナル,A+,0,
  vs.VIVGANGS,ナムコオリジナル,A+,1,
  BLAZING VORTEX(裏),ゲーム,A+,0,
  23時54分、陽の旅路のプレリュード,ナムコオリジナル,A+,1,
  にゃーにゃーにゃー！,ナムコオリジナル,A+,1,
  儚姫は原初に舞う(裏),ナムコオリジナル,A+,1,
  ラバスの虹(裏),ナムコオリジナル,A+,0,
  
  
  アピムトリーテー,ナムコオリジナル,A,1,
  或ル不和,ナムコオリジナル,A,0,
  ARMAGEDON,ナムコオリジナル,A,1,
  Unwelcome School(裏),ゲーム,A,0,
  Irregular Clock(裏),ナムコオリジナル,A,0,
  X談,ナムコオリジナル,A,1,
  彼は誰詩の誘惑(裏),ナムコオリジナル,A,1,
  GERBERA,ゲーム,A,0,
  カラフル,ナムコオリジナル,A,0,
  GIGALODON(裏),ナムコオリジナル,A,1,
  Kill My Fortune(裏),バラエティ,A,0,
  GORI × GORI × SafaRi(裏),ナムコオリジナル,A,0,
  SAVAGE DELIGHT,ナムコオリジナル,A,0,
  青天の霹明,ナムコオリジナル,A,1,
  Xevel,ゲーム,A,0,
  真方、激昂,クラシック,A,0,
  束ね糸,ナムコオリジナル,A,1,
  デッドオアダイ,ナムコオリジナル,A,1,
  転生〈TENSEI〉-喜与志が待つ強者-,ナムコオリジナル,A,0,
  HARDCOREノ心得,ナムコオリジナル,A,1,
  プチポチ,クラシック,A,0,
  Player's High,ナムコオリジナル,A,1,
  Behemoth,ナムコオリジナル,A,1,
  まるくてはやくてすさまじいリズム,ナムコオリジナル,A,1,
  Mood Swing(裏),ナムコオリジナル,A,0,
  LUNATiC CiRCUiT,ゲーム,A,0,
  絡操回廊,ナムコオリジナル,A,0,
  ココドコ？多分ドッカ島！(裏),ナムコオリジナル,A,0,
  コネクトカラーズ,ナムコオリジナル,A,1,
  Stick Trick ShowTime!!,ナムコオリジナル,A,1,
  天泣の律,ナムコオリジナル,A,1,
  Parousia,ナムコオリジナル,A,0,
  for Q(裏),ナムコオリジナル,A,0,
  モノクロームユートピア,ナムコオリジナル,A,0,
  
  
  赤と白薔薇の少女,ナムコオリジナル,個人差A,1,
  EterNal Ring,ナムコオリジナル,個人差A,1,
  懐中庭園を持つ少女,ナムコオリジナル,個人差A,1,
  カルメン組曲一番終曲(裏),クラシック,個人差A,0,
  鼓立あおはる学園高歌,ナムコオリジナル,個人差A,1,
  閃光天舞,ナムコオリジナル,個人差A,0,
  パンvsごはん！大決戦(裏)(達人限定),ナムコオリジナル,個人差A,1,
  ピッチフェイダ(裏),ナムコオリジナル,個人差A,2,2025-11-3
  ひよこ鑑定士さん,ナムコオリジナル,個人差A,1,
  FLOWER(裏),ゲーム,個人差A,0,
  8OROCHI(裏),ナムコオリジナル,個人差A,1,
  λ7708,ナムコオリジナル,個人差A,0,
  
  
  怒槌,ゲーム,B+,0,
  VERTeX,ゲーム,B+,0,
  美しく忙しきドナウ(裏),クラシック,B+,0,
  ウルトラマンX(裏),キッズ,B+,0,
  郢曲/暁闇,バラエティ,B+,0,
  カラフルボイス(裏),ナムコオリジナル,B+,0,
  気焔万丈神楽,ナムコオリジナル,B+,1,
  弧,ナムコオリジナル,B+,2,2025-10-29
  〆ドレー2000,ナムコオリジナル,B+,1,
  蛇鉄,ナムコオリジナル,B+,0,
  神竜～Shinryu～,ナムコオリジナル,B+,0,
  SUPERNOVA(裏),ナムコオリジナル,B+,2,2022-10-15
  星河一天,ナムコオリジナル,B+,1,
  DEBSTEP!,ナムコオリジナル,B+,1,
  弩蚊怒夏,クラシック,B+,0,
  Don't Stop the Game,ナムコオリジナル,B+,1,
  ナイトメアサバイバー(裏),ナムコオリジナル,B+,1,
  はたラク2000,ナムコオリジナル,B+,1,
  パンvsごはん！大決戦(達人限定),ナムコオリジナル,B+,0,
  人のお金で焼肉を食したい！(裏),ナムコオリジナル,B+,0,
  ヘイラ(裏)(カバー),ナムコオリジナル,B+,0,
  Help me さいたま2000!!,ナムコオリジナル,B+,1,
  メカデス。(裏),ナムコオリジナル,B+,0,
  蝶旋周回軌道(裏),ナムコオリジナル,B+,0,
  冷凍庫CJ～嗚呼太鼓ブラザーズ～,ナムコオリジナル,B+,1,
  LECIEL GLISSANDO,ナムコオリジナル,B+,1,
  
  
  衰 want U,ナムコオリジナル,B,1,
  蒼鷲ノ火(裏),ナムコオリジナル,B,0,
  Altale(裏),バラエティ,B,0,
  Vixtory,ナムコオリジナル,B,1,
  Agent Hustle & Dr. Hassle,ナムコオリジナル,B,1,
  案山子姫,ナムコオリジナル,B,2,2025-09-15
  Caribbean Knight,ナムコオリジナル,B,0,
  極圏,ゲーム,B,0,
  竜の子を打つ(裏),ナムコオリジナル,B,0,
  クラボスボルスカ,クラシック,B,0,
  Goldfish City,ナムコオリジナル,B,1,
  ココロボ,ナムコオリジナル,B,1,
  鼓舞曲「閻魔」,ナムコオリジナル,B,2,1999-09-09
  紫煌ノ乱,ナムコオリジナル,B,1,
  憎悪と酷悪の花束,ナムコオリジナル,B,1,
  SouLway(開幕達人),ナムコオリジナル,B,0,
  SoulStone-闇喰イサァカス団,ナムコオリジナル,B,2,1999-09-09
  超絶技巧系少女,ナムコオリジナル,B,1,
  月読命,ナムコオリジナル,B,1,
  DestrOyer(裏),バラエティ,B,0,
  テトラリュトモスフォビア,ナムコオリジナル,B,0,
  電脳幻夜の星言詠,ナムコオリジナル,B,2,2025-10-26
  Hello Mr.JOKER,ナムコオリジナル,B,2,2023-01-11
  Honey Heartbeat~10 Star Mix~,ゲーム,B,0,
  秘ナルメジェドノ悪ナル憂鬱,ナムコオリジナル,B,1,
  FUJIN Rumble,ゲーム,B,0,
  めためた☆ゆにば～すっ！(裏),ナムコオリジナル,B,0,
  またさいたま2000,ナムコオリジナル,B,2,1999-09-09
  MEGALO VANIA(裏),ゲーム,B,0,
  メタナイトの逆襲メドレー(裏),ゲーム,B,0,
  もぺもぺ,バラエティ,B,0,
  Lightning Boys,ナムコオリジナル,B,0,
  Libera Ray,ゲーム,B,0,
  Re: End of a Dream(裏),バラエティ,B,0,
  竜と黒炎の姫君,ナムコオリジナル,B,0,
  Rotter Tarmination(裏),ナムコオリジナル,B,1,
  
  
  Aragami,バラエティ,個人差B,0,
  UNDEAD HEART,ナムコオリジナル,個人差B,1,
  Valsqotch,ゲーム,個人差B,0,
  Emma(裏)(玄人譜面),ナムコオリジナル,個人差B,0,
  CUT! into the FUTURE,ナムコオリジナル,個人差B,0,
  Garakuta Doll Play(裏),ゲーム,個人差B,0,
  Calculator,ナムコオリジナル,個人差B,2,1999-09-09
  雲間を游ぐ,ナムコオリジナル,個人差B,0,
  Chronomia,バラエティ,個人差B,0,
  Gloria,ナムコオリジナル,個人差B,1,
  刻竜~Kokuryu~,ナムコオリジナル,個人差B,2,1999-09-09
  Scarlet Lance,ゲーム,個人差B,0,
  チルノのパーフェクトさんすう教室⑨(裏),バラエティ,個人差B,0,
  Purple Rose Fusion,ナムコオリジナル,個人差B,1,
  メタルホークBGM1(達人譜面),ゲーム,個人差B,0,
  memorica ficta,ナムコオリジナル,個人差B,2,1999-09-09
  4+1のそれぞれの未来,ボーカロイド,個人差B,2,1999-09-09
  燎原ノ舞,ナムコオリジナル,個人差B,2,2022-02-28
  
  
  ANIMA,ゲーム,C+,0,
  あの日出会えたキセキ,ナムコオリジナル,C+,2,2022-07-28
  天照,ナムコオリジナル,C+,2,1999-09-09
  アンリミテッドゲームズ,ナムコオリジナル,C+,2,2022-03-27
  Illusion Flare,ナムコオリジナル,C+,1,
  イオシス秋の爆食祭2024,ナムコオリジナル,C+,0,
  ex寅 Trap,ナムコオリジナル,C+,2,2025-09-13
  ギガンティックOTN(裏),ボーカロイド,C+,0,
  きたさいたま2000,ナムコオリジナル,C+,2,1999-09-09
  ゴーストマスク,ボーカロイド,C+,2,2022-04-19
  Got more raves?(裏),ゲーム,C+,0,
  God Ray,ゲーム,C+,0,
  Silent Jealousy(裏),ポップス,C+,0,
  The Future of the 太鼓ドラム,ナムコオリジナル,C+,2,2022-01-29
  晨星ト鵺,ナムコオリジナル,C+,2,2022-03-11
  Central Dogma Pt1,ナムコオリジナル,C+,1,
  Taiko Drum Monster,ナムコオリジナル,C+,1,
  D絶対！SAMURAIインザレイン(裏),バラエティ,C+,0,
  Doom Noiz,ゲーム,C+,2,2022-07-28
  とける,ナムコオリジナル,C+,1,
  天下統一録,ナムコオリジナル,C+,1,
  トイマチック☆パレード!!,ナムコオリジナル,C+,1,
  白鳥の湖(裏),クラシック,C+,0,
  Black Rose Apostle(裏),ナムコオリジナル,C+,2,1999-09-09
  みんなのうた,ゲーム,C+,0,
  モノクロボイス,ナムコオリジナル,C+,2,2022-03-27
  六本の薔薇と采の歌(裏),ナムコオリジナル,C+,0,
  What's in the box?,ナムコオリジナル,C+,1,
  wonderful POUTINE,ナムコオリジナル,C+,0,
  
  
  愛と浄罪の森,ナムコオリジナル,C,1,
  アキバ20XX,バラエティ,C,0,
  アサガオ,ナムコオリジナル,C,2,1999-09-09
  INSPION,バラエティ,C,0,
  Evidence of Evil,ナムコオリジナル,C,2,1999-09-09
  Angel Halo,ゲーム,C,2,2022-04-15
  カラ鞠の花,ボーカロイド,C,2,2022-04－06
  Calamity Fortune,バラエティ,C,0,
  きゅうくらりん(裏),ポップス,C,0,
  共奏鼓祭(裏),ナムコオリジナル,C,1,
  濃紅,ナムコオリジナル,C,1,
  濃紅(カバー),ナムコオリジナル,C,0,
  ゴーゴー・キッチン(裏),ナムコオリジナル,C,0,
  ゴッドソング(裏),ポップス,C,0,
  潮騒205号SSS線,ナムコオリジナル,C,0,
  秋竜~Shiuryu～(裏),ナムコオリジナル,C,0,
  疾風怒濤,ナムコオリジナル,C,1,
  重金属フューギティブ,ボーカロイド,C,2,1999-09-09
  Singularity Game,ナムコオリジナル,C,0,
  [双打]双竜ノ乱,ナムコオリジナル,C,0,
  十露盤2000,ナムコオリジナル,C,2,2022-07-15
  ダンガンノーツ,ナムコオリジナル,C,2,202204-13
  Doppelgangers(裏),ナムコオリジナル,C,2,2025-09-10
  夏祭り(裏),ポップス,C,0,
  ノるどん2000,ナムコオリジナル,C,2,1999-09-09
  BATTLE No.1(達人譜面),バラエティ,C,0,
  ハンロック,クラシック,C,2,2022-09-04
  ペットショップ大戦,ナムコオリジナル,C,1,
  平等院鳳凰ドンvs鳥獣戯カッ(裏),ナムコオリジナル,C,1,
  MagiCatz,ゲーム,C,2,1999-09-09
  ミュージック・リボルバー(裏),ゲーム,C,2,1999-09-09
  YOU're your HERO,ナムコオリジナル,C,0,
  YOAKE,ナムコオリジナル,C,1,
  ラブ♡スパイス♡ライクユー!!!,ナムコオリジナル,C,0,
  六華の舞,ナムコオリジナル,C,1,
  練習曲Op.10-4(裏),クラシック,C,0,
  
  
  あなたとトゥラッタッタ♪(裏),ポップス,個人差C,0,
  Aleph-0,バラエティ,個人差C,0,
  ゲゲゲの鬼太郎(裏),キッズ,個人差C,0,
  Toonn Town's Toys'Tune,ナムコオリジナル,個人差C,1,
  ドドドドドンだフル！,ナムコオリジナル,個人差C,0,
  ドドンガド～ン(裏),ナムコオリジナル,個人差C,1,
  初音ミクの激唱(裏),ボーカロイド,個人差C,0,
  
  
  蒼の旋律(裏),ナムコオリジナル,D,1,
  朱の旋律,ナムコオリジナル,D,2,2022-04-16
  Abyss of hell(裏),ゲーム,D,2,1999-09-09
  Aloft in the wind(裏),ナムコオリジナル,D,0,
  イガク(裏),ポップス,D,0,
  Ignis Danse,ナムコオリジナル,D,2,2022-04-24
  頂,ナムコオリジナル,D,1,
  ウィーアー！(裏),アニメ,D,0,
  Venemous(裏),ゲーム,D,2,1999-09-09
  うちゅうひこうし冒険譚,ナムコオリジナル,D,1,
  EkiBEN2000,ナムコオリジナル,D,2,1999-09-09
  Extreme End,ナムコオリジナル,D,0,
  Emma(裏)(普通譜面),ナムコオリジナル,D,1,
  オーブの祈り,キッズ,D,2,1999-09-09
  OK I'm blue rat,ナムコオリジナル,D,2,1999-09-09
  Oshama Scramble!(裏),ゲーム,D,2,2025-11-28
  KAGEKIYO(裏),ゲーム,D,0,
  キャラメル・ジャンキィ,ナムコオリジナル,D,0,
  Surf Zapping,ゲーム,D,2,1999-09-09
  最終鬼畜妹フランドール・S,バラエティ,D,2,1999-09-09
  承認欲Q,ナムコオリジナル,D,2,1999-09-09
  スーパーD&D,バラエティ,D,2,2022-12-07
  SUPERNOVA,ナムコオリジナル,D,2,2025-11-28
  Spectral Rider,ナムコオリジナル,D,2,1999-09-09
  セイクリッドルイン(裏),ナムコオリジナル,D,0,
  そつおめしき,ナムコオリジナル,D,2,1999-09-09
  そつおめしき2ばん,ナムコオリジナル,D,1,
  SORA-VII シグナスウォール,ナムコオリジナル,D,2,1999-09-09
  D's Adventure Note,ナムコオリジナル,D,2,2022-09-07
  てんぢく20000,ナムコオリジナル,D,2,2025-11-9
  Dog bite,バラエティ,D,0,
  No Gravity,ナムコオリジナル,D,1,
  ピコピコルイン(裏),ナムコオリジナル,D,1,
  FREEDOM DIVE↓,バラエティ,D,2,2022-09-03
  マツヨイナイトバグ(裏),バラエティ,D,0,
  三瀬川乱舞(裏),ナムコオリジナル,D,2,1999-09-09
  waitin' for u,バラエティ,D,0,
  
  
  R.I.,ナムコオリジナル,E,2,1999-09-09
  VICTORIA,ナムコオリジナル,E,2,1999-09-09
  VIVIVID,ナムコオリジナル,E,2,1999-09-09
  詩謳兎揺蕩兎,ナムコオリジナル,E,0,
  X-DAY2000,ナムコオリジナル,E,2,2021-10-24
  オーバード(裏),ポップス,E,0,
  【双打】Garakuta Doll Play(裏),ゲーム,E,0,
  GIGALODON,ナムコオリジナル,E,1,
  キューティー☆デモニック☆魔神エモ！,ナムコオリジナル,E,0,
  【双打】紅(裏),ポップス,E,0,
  Clotho クロート,ナムコオリジナル,E,2,1999-09-09
  さちさちにしてあげる♪(裏),ボーカロイド,E,2,2022-08-12
  須佐之男,ナムコオリジナル,E,2,1999-09-09
  SstTAarR*,ボーカロイド,E,2,1999-09-09
  零の交響曲(裏),ナムコオリジナル,E,1,
  旋風ノ舞(天),ナムコオリジナル,E,2,1999-09-09
  旋風ノ舞(天)(裏),ナムコオリジナル,E,2,1999-09-09
  Soulway(開幕普通),ナムコオリジナル,E,0,
  タイコロール,ナムコオリジナル,E,2,2022-08-29
  タイコタイム(裏),ナムコオリジナル,E,2,1999-09-09
  Diving Drive,ナムコオリジナル,E,0,
  タベルナ2000,ナムコオリジナル,E,2,1999-09-09
  チルノのパーフェクトさんすう教室(裏),バラエティ,E,2,1999-09-09
  儚姫は原初に舞う,ナムコオリジナル,E,2,1999-09-09
  初音ミクの激唱,ボーカロイド,E,2,2025-10-09
  ヒバナ(裏),ボーカロイド,E,2,1999-09-09
  星屑ストラック,ナムコオリジナル,E,2,1999-09-09
  8OROCHI,ナムコオリジナル,E,2,1999-09-09
  よーいドン！,ナムコオリジナル,E,2,2022-07-28
  夜桜謝肉祭(裏),ナムコオリジナル,E,1,
  
  【双打】KAGEKIYO(裏),ゲーム,F,0,
  Kamikaze Remix,ゲーム,F,2,1999-09-09
  ネクロファンタジア,バラエティ,F,2,1999-09-09
  拝啓ドッペルゲンガー,ボーカロイド,F,2,1999-09-09
  パンvsごはん！大決戦(普通譜面),ナムコオリジナル,F,0,
  パンvsごはん！大決戦(裏),ナムコオリジナル,F,0,
  BATTLE NO.1(玄人譜面),バラエティ,F,0,
  BATTLE NO.1(普通譜面),バラエティ,F,0,
  Black Rose Apostle,ナムコオリジナル,F,2,1999-09-09
  Blessed Bouquet Buskers,ナムコオリジナル,F,2,1999-09-09
  mint tears,ナムコオリジナル,F,2,1999-09-09
  乱数調整のリバースシンデレラ(裏),ポップス,F,2,1999-9-9
  `.trim();
