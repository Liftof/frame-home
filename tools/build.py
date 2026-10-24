"""Build an unsigned, self-contained WGT. Signing remains in the Samsung SDK."""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile
from configuration import ROOT, javascript, read

APP=ROOT/'app'
NS={'t':'http://tizen.org/ns/widgets','w':'http://www.w3.org/ns/widgets'}
EXPECTED_ID='FrameHome1.FrameHome'
PRIVILEGES={f'http://tizen.org/privilege/{name}' for name in ['application.launch','application.info','tv.window','tv.audio','tv.channel']}


def contents(public=False):
    read(public)
    manifest=ET.parse(APP/'config.xml').getroot()
    identity=manifest.find('t:application',NS)
    if identity.attrib!={'id':EXPECTED_ID,'package':'FrameHome1','required_version':'6.5'}:
        raise ValueError('Unexpected application identity.')
    if {p.get('name') for p in manifest.findall('t:privilege',NS)}!=PRIVILEGES:
        raise ValueError('Unexpected privileges.')
    if manifest.find('t:setting',NS).get('background-support')!='disable' or manifest.findall('t:service',NS) or manifest.findall('t:metadata',NS) or manifest.findall('w:access',NS):
        raise ValueError('Background services, private metadata and external access are excluded.')
    files={}
    allowed={'.js','.html','.css','.svg','.png','.jpg','.woff2','.txt','.md','.xml','.json','.webp'}
    for path in sorted(APP.rglob('*')):
        name=path.relative_to(APP).as_posix()
        if path.is_symlink():
            raise ValueError('Symlinks are not packaged.')
        if not path.is_file() or (public and name.startswith('assets/local/')):
            continue
        if path.suffix.lower() not in allowed or any(part.startswith('.') for part in Path(name).parts):
            raise ValueError('Unexpected application file: '+name)
        data=javascript(public).encode() if name=='config.js' else path.read_bytes()
        if path.suffix=='.js':
            source=data.decode()
            for forbidden in ['fetch(', 'XMLHttpRequest', 'WebSocket', 'vconf', 'set_artmode', 'app_operation_set_current_app']:
                if forbidden in source:
                    raise ValueError('Unexpected native/network operation in '+name)
        files[name]=data
    return manifest.get('version'),files


def build(public=False):
    version,files=contents(public)
    dist=ROOT/'dist';dist.mkdir(exist_ok=True)
    target=dist/f'Frame-Home-{version}-unsigned.wgt'
    files.update({'LICENSES/'+path.name:path.read_bytes() for path in sorted((ROOT/'LICENSES').glob('*.txt'))})
    files['LICENSE']=(ROOT/'LICENSE').read_bytes()
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,data in files.items():
            info=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            archive.writestr(info,data)
    report={'version':version,'applicationId':EXPECTED_ID,'signed':False,'publicDefaults':public,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'files':{name:hashlib.sha256(data).hexdigest() for name,data in files.items()}}
    (dist/'package-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='files'},indent=2))
    return target


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--public',action='store_true',help='Ignore all local settings and imported media. Use for shared artifacts.')
    build(parser.parse_args().public)
