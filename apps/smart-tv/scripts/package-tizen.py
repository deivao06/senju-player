"""Create an UNSIGNED WGT development artifact; not directly installable on a TV."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import xml.etree.ElementTree as ET

app = Path(__file__).resolve().parents[1]
source = app / 'build' / 'tizen'
output = app / 'build' / 'packages' / 'senju-player-samsung-unsigned.wgt'
ET.parse(source / 'config.xml')
if not (source / 'index.html').is_file():
    raise SystemExit('Execute pnpm smart:build:tizen primeiro.')
output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(source.rglob('*')):
        if path.is_file() and not path.name.endswith('.json'):
            archive.write(path, path.relative_to(source).as_posix())
print(f'{output}: WGT SEM ASSINATURA, exige perfil/certificado Samsung antes de instalar.')
