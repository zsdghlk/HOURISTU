#!/usr/bin/env python3
# coding: utf-8
import os, sys, argparse, json, fnmatch
from pathlib import Path

def load_gitignore(root: Path):
    patterns = []
    gi = root / ".gitignore"
    if gi.exists():
        for line in gi.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            patterns.append(line)
    return patterns

def should_ignore(name: str, relpath: str, patterns, extra_ignores, show_hidden):
    if not show_hidden and name.startswith("."):
        return True
    for p in extra_ignores:
        if fnmatch.fnmatch(name, p) or fnmatch.fnmatch(relpath, p):
            return True
    for p in patterns:
        tgt = relpath if p.startswith("/") else name
        patt = p.lstrip("/")
        if fnmatch.fnmatch(tgt, patt) or fnmatch.fnmatch(relpath, patt):
            return True
    return False

def list_dir(root: Path, max_depth, ignores, show_hidden, dirs_only, files_only, limit_per_dir, follow_symlinks):
    gitignore_patterns = load_gitignore(root)

    def walk(cur: Path, depth: int, prefix_parts):
        rel = str(cur.relative_to(root)) if cur != root else ""
        try:
            entries = sorted(cur.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
        except PermissionError:
            yield ("perm", cur, prefix_parts, False)
            return
        truncated = False
        if limit_per_dir and len(entries) > limit_per_dir:
            entries = entries[:limit_per_dir]
            truncated = True

        show_list = []
        for e in entries:
            relp = (rel + ("/" if rel else "")) + e.name
            if should_ignore(e.name, relp, gitignore_patterns, ignores, show_hidden):
                continue
            if dirs_only and not e.is_dir():
                continue
            if files_only and not e.is_file():
                continue
            show_list.append(e)

        for i, e in enumerate(show_list):
            is_last = (i == len(show_list) - 1)
            yield ("node", e, prefix_parts + [is_last], truncated and is_last)
            if e.is_dir():
                if max_depth is None or depth < max_depth:
                    if e.is_symlink() and not follow_symlinks:
                        continue
                    yield from walk(e, depth + 1, prefix_parts + [is_last])

    yield from walk(root, 1, [])

def visual_prefix(prefix_flags):
    if not prefix_flags:
        return ""
    s = ""
    for is_last in prefix_flags[:-1]:
        s += "    " if is_last else "│   "
    s += "└── " if prefix_flags[-1] else "├── "
    return s

def to_text(root: Path, items):
    lines = [str(root.name) + "/"]
    for kind, path, pre, truncated_flag in items:
        if kind == "perm":
            lines.append(f"{visual_prefix(pre)}[permission denied]")
            continue
        name = path.name + ("/" if path.is_dir() else "")
        if path.is_symlink():
            try:
                target = os.readlink(path)
            except OSError:
                target = "?"
            name += f" -> {target}"
        lines.append(f"{visual_prefix(pre)}{name}")
        if truncated_flag:
            lines.append(("".join("    " if p else "│   " for p in pre)) + "… (truncated)")
    return "\n".join(lines)

def to_json(root: Path, items):
    node = {"name": root.name, "type": "dir", "children": []}
    index = {str(root.resolve()): node}

    for kind, path, pre, _ in items:
        if kind == "perm":
            continue
        p = path.resolve()
        parent = p.parent.resolve()
        parent_node = index.get(str(parent))
        if parent_node is None:
            continue
        cur = {"name": path.name, "type": "dir" if path.is_dir() else "file"}
        if path.is_symlink():
            try:
                cur["symlink_to"] = os.readlink(path)
            except OSError:
                cur["symlink_to"] = "?"
        parent_node.setdefault("children", []).append(cur)
        if path.is_dir():
            index[str(p)] = cur
            cur.setdefault("children", [])
    return node

def main():
    ap = argparse.ArgumentParser(description="Print tree-like view of a directory (no external deps).")
    ap.add_argument("path", nargs="?", default=".", help="root directory (default: .)")
    ap.add_argument("--max-depth", "-d", type=int, help="max depth (default: unlimited)")
    ap.add_argument("--ignore", "-I", action="append", default=[], help="glob to ignore (repeatable)")
    ap.add_argument("--show-hidden", action="store_true", help="show dotfiles")
    ap.add_argument("--dirs-only", action="store_true", help="show directories only")
    ap.add_argument("--files-only", action="store_true", help="show files only")
    ap.add_argument("--json", action="store_true", help="output as JSON")
    ap.add_argument("--limit-per-dir", type=int, default=0, help="limit entries per directory (0=unlimited)")
    ap.add_argument("--follow-symlinks", action="store_true", help="descend into symlinked directories")
    ap.add_argument("--relative", action="store_true", help="print root as '.' instead of folder name")
    args = ap.parse_args()

    root = Path(args.path).resolve()
    if not root.exists() or not root.is_dir():
        print(f"Error: directory not found: {root}", file=sys.stderr)
        sys.exit(2)

    items = list(list_dir(
        root=root,
        max_depth=args.max_depth,
        ignores=args.ignore,
        show_hidden=args.show_hidden,
        dirs_only=args.dirs_only,
        files_only=args.files_only,
        limit_per_dir=args.limit_per_dir,
        follow_symlinks=args.follow_symlinks
    ))

    if args.json:
        data = to_json(root, items)
        if args.relative:
            data["name"] = "."
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        txt = to_text(root, items)
        if args.relative:
            txt = txt.replace(txt.splitlines()[0], ".")
        print(txt)

if __name__ == "__main__":
    main()
