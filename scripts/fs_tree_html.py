#!/usr/bin/env python3
# coding: utf-8
import argparse, json, subprocess, sys
from pathlib import Path

def run_fs_tree_json(root, depth, ignores, show_hidden, dirs_only, files_only, limit_per_dir, follow_symlinks, relative):
    here = Path(__file__).parent
    fs_tree = here / "fs_tree.py"
    if not fs_tree.exists():
        print("Error: scripts/fs_tree.py が見つかりません。先に作成してください。", file=sys.stderr)
        sys.exit(2)

    cmd = [sys.executable, str(fs_tree), str(Path(root).resolve()), "--json"]
    if depth is not None:
        cmd += ["-d", str(depth)]
    for ig in (ignores or []):
        cmd += ["-I", ig]
    if show_hidden:
        cmd += ["--show-hidden"]
    if dirs_only:
        cmd += ["--dirs-only"]
    if files_only:
        cmd += ["--files-only"]
    if limit_per_dir:
        cmd += ["--limit-per-dir", str(limit_per_dir)]
    if follow_symlinks:
        cmd += ["--follow-symlinks"]
    if relative:
        cmd += ["--relative"]

    out = subprocess.check_output(cmd)
    return json.loads(out.decode("utf-8"))

HTML_TMPL = """<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Repo Tree Viewer</title>
<style>
  :root { --fg:#111; --muted:#666; --bg:#fff; --line:#ddd; --accent:#0b5fff; }
  @media (prefers-color-scheme: dark) {
    :root { --fg:#eee; --muted:#aaa; --bg:#0b0f17; --line:#2a2f3a; --accent:#6aa3ff; }
  }
  html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,Segoe UI,Roboto,Helvetica,Arial,"Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif}
  header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 12px;z-index:5}
  .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  input[type="search"]{flex:1;min-width:220px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--fg)}
  .btn{border:1px solid var(--line);padding:8px 10px;border-radius:10px;background:transparent;color:var(--fg);cursor:pointer}
  .btn:hover{border-color:var(--accent)}
  main{padding:12px;display:grid;grid-template-columns:1fr 360px;gap:16px}
  @media (max-width: 980px){ main{grid-template-columns:1fr} #panel{order:-1} }
  .stats{color:var(--muted);font-size:12px}
  .tree{margin:10px 0 40px 0}
  .tree ul{list-style:none;padding-left:20px;border-left:1px dashed var(--line)}
  .tree li{margin:2px 0;white-space:nowrap;cursor:default}
  .node{display:flex;align-items:center;gap:6px}
  .label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  .dir>.label{font-weight:600}
  .file .ext{color:var(--muted);font-size:12px}
  details{margin:2px 0}
  details>summary{list-style:none;cursor:pointer}
  summary::-webkit-details-marker{display:none}
  .hit{background:rgba(11,95,255,0.10);border-radius:6px}
  .muted{color:var(--muted)}
  #panel{border:1px solid var(--line);border-radius:12px;padding:12px}
  #panel h3{margin:0 0 8px 0;font-size:16px}
  #panel .kv{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
  #panel .role{display:inline-block;padding:2px 8px;border:1px solid var(--line);border-radius:20px;margin:4px 0}
  #panel .desc{margin:8px 0;color:var(--muted)}
  .clickable{cursor:pointer}
  .selected{outline:2px solid var(--accent);border-radius:6px}
</style>
</head>
<body>
<header>
  <div class="row">
    <input id="q" type="search" placeholder="フィルタ（例: app/law, *.tsx, api）" />
    <button id="expand" class="btn">すべて展開</button>
    <button id="collapse" class="btn">すべて折りたたみ</button>
    <span id="stats" class="stats"></span>
  </div>
</header>
<main>
  <section>
    <div id="rootName" class="muted"></div>
    <div id="tree" class="tree"></div>
  </section>
  <aside id="panel">
    <h3>ファイル情報</h3>
    <div id="p_name" class="kv">選択してください</div>
    <div id="p_role" class="role"></div>
    <div id="p_desc" class="desc"></div>
    <div class="kv"><b>Path:</b> <span id="p_path"></span></div>
    <div class="kv"><b>Type:</b> <span id="p_type"></span></div>
    <div class="kv"><b>Ext:</b> <span id="p_ext"></span></div>
  </aside>
</main>
<script>
  const DATA = __DATA_JSON__;
  const ROOT_LABEL = DATA.name || "repo";

  const $tree = document.getElementById('tree');
  const $q = document.getElementById('q');
  const $stats = document.getElementById('stats');
  const $rootName = document.getElementById('rootName');
  $rootName.textContent = "Root: " + ROOT_LABEL;

  const $pName = document.getElementById('p_name');
  const $pRole = document.getElementById('p_role');
  const $pDesc = document.getElementById('p_desc');
  const $pPath = document.getElementById('p_path');
  const $pType = document.getElementById('p_type');
  const $pExt  = document.getElementById('p_ext');

  function icon(node){
    if(node.type === 'dir') return "📁";
    const n = (node.name||"").toLowerCase();
    if(n.endsWith('.md')) return "��";
    if(n.endsWith('.ts')||n.endsWith('.tsx')||n.endsWith('.js')||n.endsWith('.jsx')) return "🧩";
    if(n.endsWith('.json')) return "🧾";
    if(n.endsWith('.png')||n.endsWith('.jpg')||n.endsWith('.jpeg')||n.endsWith('.svg')||n.endsWith('.gif')) return "🖼️";
    if(n.endsWith('.pdf')) return "📄";
    return "📄";
  }

  // ===== Next.js App Router 向け 役割判定 =====
  function roleInfo(path, isDir){
    const p = path.replace(/\\\\/g,'/'); // normalize
    const name = p.split('/').pop() || '';
    const ext = (name.includes('.') ? name.split('.').pop() : '').toLowerCase();

    // 1) ディレクトリ/ルート系
    if(isDir){
      if(p === 'app' || p.startsWith('app/')) return ['App Router ルート', 'Next.js App Router のルーティング・UIツリー。各セグメント配下に page/layout/error などを配置。'];
      if(p === 'public' || p.startsWith('public/')) return ['静的アセット', 'そのまま配信される公開ファイル置き場。/favicon.ico など。'];
      if(p.startsWith('app/api/')) return ['API ルート群', 'App Router の Route Handlers をまとめたディレクトリ。HTTP エンドポイントを提供。'];
      if(p === 'components' || p.startsWith('components/')) return ['UI コンポーネント', '再利用可能な表示部品置き場。'];
      if(p === 'lib' || p.startsWith('lib/')) return ['ライブラリ/ユーティリティ', 'ビジネスロジックやユーティリティ関数等。'];
      return ['ディレクトリ', ''];
    }

    // 2) app セグメントの特別ファイル
    if(/^app\/.*\/page\.(tsx|jsx|js|ts)$/.test(p) || p === 'app/page.tsx' || p === 'app/page.jsx'){
      return ['ページ（Route）', 'URL に直接対応するページコンポーネント。'];
    }
    if(/^app\/.*\/layout\.(tsx|jsx|js|ts)$/.test(p) || p === 'app/layout.tsx' || p === 'app/layout.jsx'){
      return ['レイアウト', 'セグメント配下の共通 UI。children を含む。'];
    }
    if(/^app\/.*\/template\.(tsx|jsx|js|ts)$/.test(p)){
      return ['テンプレート', 'マウント毎に再生成されるレイアウト相当の UI。'];
    }
    if(/^app\/.*\/loading\.(tsx|jsx|js|ts)$/.test(p)){
      return ['ローディング UI', '遅延時に表示するローディング用コンポーネント。'];
    }
    if(/^app\/.*\/error\.(tsx|jsx|js|ts)$/.test(p)){
      return ['エラー UI', 'セグメント配下のエラー境界。'];
    }
    if(/^app\/.*\/not-found\.(tsx|jsx|js|ts)$/.test(p)){
      return ['404 UI', 'そのセグメントの 404 表示。'];
    }
    if(/^app\/.*\/default\.(tsx|jsx|js|ts)$/.test(p)){
      return ['Parallel Routes 既定', 'パラレルルートの未選択スロット表示。'];
    }
    if(/^app\/.*\/route\.(ts|js)$/.test(p)){
      return ['Route Handler(API)', 'HTTP メソッドごとのハンドラを定義する API ルート。'];
    }
    if(/^middleware\.(ts|js)$/.test(name)){
      return ['Middleware', 'リクエスト前処理（国際化・認可など）。'];
    }

    // 3) 設定・構成ファイル
    if(name === 'next.config.js' || name === 'next.config.ts'){
      return ['Next.js 設定', 'Next.js 全体の設定。'];
    }
    if(name === 'tailwind.config.js' || name === 'tailwind.config.ts'){
      return ['Tailwind 設定', 'Tailwind CSS の設定。'];
    }
    if(name === 'postcss.config.js' || name === 'postcss.config.cjs'){
      return ['PostCSS 設定', 'PostCSS の設定。'];
    }
    if(name === 'tsconfig.json'){
      return ['TypeScript 設定', 'TypeScript コンパイラ設定。'];
    }
    if(name === 'package.json'){
      return ['パッケージ定義', '依存関係・スクリプト・メタ情報。'];
    }
    if(name === 'globals.css'){
      return ['グローバル CSS', 'アプリ全体のスタイル。'];
    }
    if(/^robots\.txt$/.test(name)){
      return ['robots.txt', 'クローラ向けのクロール制御。'];
    }
    if(/^sitemap\.xml$/.test(name)){
      return ['サイトマップ', '検索エンジン向け URL 一覧。'];
    }
    if(/^icon\.(png|ico|svg)$/.test(name) || name === 'favicon.ico'){
      return ['サイトアイコン', 'ブラウザや PWA 用のアイコン。'];
    }

    // 4) よくある配置
    if(p.startsWith('components/') && /\.(tsx|jsx|ts|js)$/.test(name)){
      return ['UI コンポーネント', '再利用可能なコンポーネント。'];
    }
    if(p.startsWith('lib/') && /\.(ts|js)$/.test(name)){
      return ['ユーティリティ/ロジック', '関数群やサービス層の実装。'];
    }
    if(p.startsWith('public/')){
      return ['静的アセット', 'そのまま配信されるファイル。'];
    }

    // 5) 拡張子ベースの汎用
    if(['ts','tsx','js','jsx'].includes(ext)) return ['ソースコード', ''];
    if(['css','scss'].includes(ext)) return ['スタイル', ''];
    if(['md','mdx'].includes(ext)) return ['ドキュメント', ''];
    if(['json'].includes(ext)) return ['設定/データ(JSON)', ''];
    return ['ファイル', ''];
  }

  function build(node, basePath){
    // basePath: 親までの相対パス
    if(node.type === 'dir'){
      const det = document.createElement('details');
      const sum = document.createElement('summary');
      const path = basePath ? (basePath + '/' + node.name) : node.name;
      sum.innerHTML = '<span class="node dir clickable"><span>'+icon(node)+'</span><span class="label">'+escapeHtml(node.name)+'/</span><span class="muted">'+(node.children?.length||0)+'項目</span></span>';
      sum.dataset.path = path;
      sum.onclick = (e)=>{ e.stopPropagation(); select(path, true); };
      det.appendChild(sum);
      const ul = document.createElement('ul');
      (node.children||[]).sort((a,b)=>{
        const da = (a.type==='dir')?0:1, db = (b.type==='dir')?0:1;
        if(da!==db) return da-db;
        return a.name.localeCompare(b.name, 'ja');
      }).forEach(ch=>{
        ul.appendChild(buildItem(ch, path));
      });
      det.appendChild(ul);
      return det;
    } else {
      return buildItem(node, basePath);
    }
  }

  function buildItem(node, basePath){
    const path = basePath ? (basePath + '/' + node.name) : node.name;
    if(node.type === 'dir'){
      const li = document.createElement('li');
      const det = build(node, path);
      li.appendChild(det);
      return li;
    }
    const li = document.createElement('li');
    li.className = 'file';
    const span = document.createElement('span');
    span.className = 'node clickable';
    span.dataset.path = path;
    span.onclick = (e)=>{ e.stopPropagation(); select(path, false, li); };
    span.innerHTML = '<span>'+icon(node)+'</span><span class="label">'+escapeHtml(node.name)+'</span>'+extBadge(node.name);
    li.appendChild(span);
    return li;
  }

  function extBadge(name){
    const idx = name.lastIndexOf('.');
    if(idx<=0) return '';
    const ext = name.slice(idx+1);
    return ' <span class="ext">.'+escapeHtml(ext)+'</span>';
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }

  function render(){
    $tree.innerHTML = '';
    $tree.appendChild(build(DATA, ''));
    $stats.textContent = countStats(DATA);
  }

  function countStats(node){
    let files=0, dirs=0;
    function walk(n){
      if(n.type==='dir'){
        dirs++;
        (n.children||[]).forEach(walk);
      } else files++;
    }
    walk(node);
    return `dirs: ${dirs-1}, files: ${files}`;
  }

  function match(glob, text){
    if(!glob) return true;
    glob = glob.toLowerCase();
    text = text.toLowerCase();
    const parts = glob.split('*');
    let pos = 0;
    for(const p of parts){
      if(!p) continue;
      const i = text.indexOf(p, pos);
      if(i<0) return false;
      pos = i + p.length;
    }
    return true;
  }

  function filterTree(q){
    const glob = q.trim();
    let hits = 0;

    function recurse(el){
      if(el.tagName==='DETAILS'){
        const sum = el.querySelector(':scope > summary .label');
        const name = sum?.textContent || '';
        const ul = el.querySelector(':scope > ul');
        let childHit = 0;
        ul.querySelectorAll(':scope > li').forEach(li=>{
          const h = recurse(li);
          childHit += h;
          li.style.display = h ? '' : 'none';
        });
        const selfHit = match(glob, name);
        const hit = selfHit || childHit>0;
        sum?.classList.toggle('hit', selfHit && glob);
        el.style.display = hit ? '' : 'none';
        el.open = hit && glob ? true : el.open;
        hits += hit ? 1 : 0;
        return hit ? 1 : 0;
      } else if(el.tagName==='LI'){
        const lab = el.querySelector(':scope .label');
        const name = lab?.textContent || '';
        const isHit = match(glob, name);
        lab?.classList.toggle('hit', isHit && glob);
        hits += isHit ? 1 : 0;
        return isHit ? 1 : 0;
      }
      return 0;
    }

    const top = $tree.firstElementChild;
    if(!top) return;
    recurse(top);
    $stats.textContent = countStats(DATA) + (glob ? ` | hits: ${hits}` : '');
  }

  // 選択して右ペインへ反映
  let lastSel;
  function select(path, isDir, liElem){
    if(lastSel) lastSel.classList.remove('selected');
    if(liElem) { liElem.classList.add('selected'); lastSel = liElem; }
    const name = path.split('/').pop() || path;
    const ext = (name.includes('.') ? name.split('.').pop() : '');
    const [role, desc] = roleInfo(path, isDir);
    $pName.textContent = name;
    $pRole.textContent = role || '';
    $pDesc.textContent = desc || '';
    $pPath.textContent = path;
    $pType.textContent = isDir ? 'directory' : 'file';
    $pExt.textContent = isDir ? '-' : (ext || '(none)');
  }

  // 初期描画
  render();

  // コントロール
  document.getElementById('expand').onclick = ()=> {
    $tree.querySelectorAll('details').forEach(d=>d.open = true);
  };
  document.getElementById('collapse').onclick = ()=> {
    $tree.querySelectorAll('details').forEach(d=>d.open = false);
  };
  let t=null;
  $q.addEventListener('input', ()=>{
    clearTimeout(t); t=setTimeout(()=>filterTree($q.value), 120);
  });
</script>
</body>
</html>
"""

def main():
    ap = argparse.ArgumentParser(description="Generate a nice HTML tree view (collapsible, searchable, with Next.js role hints).")
    ap.add_argument("path", nargs="?", default=".", help="root directory (default: .)")
    ap.add_argument("-o", "--output", default="/tmp/tree.html", help="output HTML file (default: /tmp/tree.html)")
    ap.add_argument("-d", "--max-depth", type=int, help="max depth (default: unlimited)")
    ap.add_argument("-I", "--ignore", action="append", default=[], help="glob to ignore (repeatable)")
    ap.add_argument("--show-hidden", action="store_true", help="include dotfiles")
    ap.add_argument("--dirs-only", action="store_true", help="directories only")
    ap.add_argument("--files-only", action="store_true", help="files only")
    ap.add_argument("--limit-per-dir", type=int, default=0, help="limit entries per directory")
    ap.add_argument("--follow-symlinks", action="store_true", help="descend into symlinked directories")
    ap.add_argument("--relative", action="store_true", help="root label as '.'")
    args = ap.parse_args()

    data = run_fs_tree_json(
        root=args.path,
        depth=args.max_depth,
        ignores=args.ignore,
        show_hidden=args.show_hidden,
        dirs_only=args.dirs_only,
        files_only=args.files_only,
        limit_per_dir=args.limit_per_dir,
        follow_symlinks=args.follow_symlinks,
        relative=args.relative
    )

    html = HTML_TMPL.replace("__DATA_JSON__", json.dumps(data, ensure_ascii=False))
    out = Path(args.output)
    out.write_text(html, encoding="utf-8")
    print(str(out))

if __name__ == "__main__":
    main()
