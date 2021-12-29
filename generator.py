import io
import os, json5
from pathlib import Path

if __name__ == '__main__':
    output = []
    for p in os.listdir("people/"):
        info_path = f'people/{p}/info.json5'
        if os.path.isfile(info_path):
            with io.open(info_path, 'r', encoding='utf-8') as f:
                o = json5.load(f)
                output.append({'path': p, 'id': o['id'], 'name': o['name'], 'profileUrl': o['profileUrl'], 'baseUrl': f'/people/{p}'})

    Path("generated").mkdir(parents=True, exist_ok=True)
    with io.open('generated/people-list.json5', 'w', encoding='utf-8') as f:
        f.write(json5.dumps(output, indent=2, ensure_ascii=False))
