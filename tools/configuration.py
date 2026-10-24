"""Read opt-in local configuration; never consume credentials or a TV address."""
from pathlib import Path
import json
import math
import re
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {'solar', 'channelProfile', 'favoriteNames', 'cards', 'wallpapers', 'theme'}


def local_image(value):
    if not isinstance(value, str) or not re.fullmatch(r'assets/local/[a-z0-9][a-z0-9_-]*\.(jpg|png|webp)', value):
        raise ValueError('Custom images must be files inside app/assets/local/.')
    path = ROOT/'app'/value
    if not path.is_file() or path.is_symlink():
        raise ValueError('Custom image is missing or is a symlink.')
    return value


def validate(value):
    if not isinstance(value, dict) or set(value)-ALLOWED:
        raise ValueError('Unsupported setting. Device addresses, credentials and arbitrary code are not settings.')
    site = value.get('solar')
    if site is not None:
        if not isinstance(site, dict) or set(site)-{'label','latitude','longitude','timeZone'}:
            raise ValueError('Invalid solar settings.')
        for key, limit in [('latitude',66),('longitude',180)]:
            n = site.get(key)
            if type(n) not in (int,float) or not math.isfinite(n) or abs(n)>limit:
                raise ValueError('Solar coordinates outside the supported range.')
        if not isinstance(site.get('label',''),str) or len(site.get('label',''))>60:
            raise ValueError('Invalid city label.')
        ZoneInfo(site['timeZone'])
    if value.get('channelProfile') not in (None, 'fr-tvplus'):
        raise ValueError('Unknown channel profile.')
    names = value.get('favoriteNames',[])
    if not isinstance(names,list) or len(names)>6 or any(not isinstance(n,str) or not n.strip() or len(n)>256 for n in names):
        raise ValueError('Use at most six application names.')
    cards = value.get('cards',{})
    if not isinstance(cards,dict) or len(cards)>100:
        raise ValueError('Invalid custom cards.')
    for name, image in cards.items():
        if not isinstance(name,str) or not name or len(name)>256:
            raise ValueError('Invalid application name.')
        local_image(image)
    wallpapers = value.get('wallpapers',[])
    if not isinstance(wallpapers,list) or len(wallpapers)>16:
        raise ValueError('Too many custom wallpapers.')
    ids = set()
    for entry in wallpapers:
        if not isinstance(entry,dict) or set(entry)-{'id','name','frames'}:
            raise ValueError('Invalid wallpaper entry.')
        if not re.fullmatch(r'custom-[a-z0-9-]{1,50}',entry.get('id','')) or entry['id'] in ids:
            raise ValueError('Custom wallpaper IDs must be unique and start with custom-.')
        ids.add(entry['id'])
        if not isinstance(entry.get('name'),str) or not entry['name'].strip() or len(entry['name'])>60:
            raise ValueError('Invalid wallpaper name.')
        frames = entry.get('frames')
        if not isinstance(frames,list) or not 1<=len(frames)<=24:
            raise ValueError('Invalid wallpaper phases.')
        previous=-1
        for frame in frames:
            if not isinstance(frame,dict) or set(frame)!={'from','file'} or type(frame['from']) is not int or not previous<frame['from']<1440:
                raise ValueError('Wallpaper phases must be ordered minutes, starting at 0.')
            previous=frame['from'];image=local_image(frame['file'])
            if not image.endswith('.jpg'):
                raise ValueError('Wallpaper imports must use JPEG.')
            local_image(image[:-4]+'-thumb.jpg')
        if frames[0]['from']!=0:
            raise ValueError('The first wallpaper phase must start at 0.')
    if 'theme' in value and value['theme'] not in {'coast','slate'}|ids:
        raise ValueError('Unknown initial wallpaper.')
    return value


def read(public=False):
    path=ROOT/'local/settings.json'
    if public or not path.exists():
        return {}
    if path.stat().st_size>100_000 or path.is_symlink():
        raise ValueError('Local settings file is too large or is a symlink.')
    return validate(json.loads(path.read_text()))


def javascript(public=False):
    settings=read(public)
    return ('window.FrameUserConfig = '+json.dumps(settings,ensure_ascii=True)+';\n' if settings else '')+(ROOT/'app/config.js').read_text()
