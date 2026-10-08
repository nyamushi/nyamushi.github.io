"""打印 HTML 中联系区附近的片段，便于精确插入内容。"""
import sys
from pathlib import Path

p = Path(sys.argv[1] if len(sys.argv) > 1 else 'portfolio-2026/index.html')
s = p.read_text(encoding='utf-8')

key = 'id="contact"'
i = s.find(key)
print(f'{key} 位置: {i} / 总长 {len(s)}')
print('---')
print(s[max(0, i - 80): i + 800])
print('--- 结尾 400 字符 ---')
print(s[-400:])
