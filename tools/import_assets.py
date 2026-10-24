"""Import images you are allowed to use into the ignored, local-only asset folder."""
import argparse
import io
import json
import re
import warnings
from pathlib import Path
from configuration import ROOT, validate


def clean_image(path):
    try:
        from PIL import Image, ImageOps, ImageCms
    except ImportError as error:
        raise SystemExit('Install the optional image tools: python3 -m pip install -r requirements-tools.txt') from error
    Image.MAX_IMAGE_PIXELS=32_000_000
    with warnings.catch_warnings():
        warnings.simplefilter('error',Image.DecompressionBombWarning)
        with Image.open(path) as source:
            if source.format not in {'JPEG','PNG','WEBP'}:
                raise ValueError('Only JPEG, PNG and WebP imports are supported.')
            image=ImageOps.exif_transpose(source).convert('RGB')
            profile=source.info.get('icc_profile')
            if profile:
                if len(profile)>4_000_000:
                    raise ValueError('Embedded colour profile is too large.')
                image=ImageCms.profileToProfile(image,ImageCms.ImageCmsProfile(io.BytesIO(profile)),ImageCms.createProfile('sRGB'),outputMode='RGB')
            fresh=Image.new('RGB',image.size);fresh.paste(image)
    return fresh


def write_jpeg(source,path,size,quality):
    from PIL import Image
    image=source.copy();image.thumbnail(size,Image.Resampling.LANCZOS)
    image.save(path,'JPEG',quality=quality,subsampling=0,optimize=True)


def import_image(args):
    folder=ROOT/'app/assets/local';folder.mkdir(exist_ok=True)
    settings_file=ROOT/'local/settings.json';settings_file.parent.mkdir(exist_ok=True)
    settings=json.loads(settings_file.read_text()) if settings_file.exists() else {}
    slug=args.id
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,40}',slug):
        raise ValueError('Use a lowercase ID with letters, numbers and hyphens.')
    if args.kind=='wallpaper':
        paths=[folder/f'{slug}-{phase}{suffix}.jpg' for phase in ['day','night'] for suffix in ['', '-thumb']]
    else:
        paths=[folder/f'{slug}.jpg']
    if any(path.exists() for path in paths):
        raise ValueError('An imported file already uses this ID. Choose a new ID; no file was overwritten.')
    try:
        if args.kind=='wallpaper':
            images=[clean_image(args.day),clean_image(args.night)]
            for phase,image in zip(['day','night'],images):
                write_jpeg(image,folder/f'{slug}-{phase}.jpg',(1920,1080),90)
                write_jpeg(image,folder/f'{slug}-{phase}-thumb.jpg',(532,300),84)
            entry={'id':'custom-'+slug,'name':args.name,'frames':[{'from':0,'file':f'assets/local/{slug}-night.jpg'},{'from':420,'file':f'assets/local/{slug}-day.jpg'},{'from':1140,'file':f'assets/local/{slug}-night.jpg'}]}
            settings.setdefault('wallpapers',[]).append(entry);settings['theme']=entry['id']
        else:
            write_jpeg(clean_image(args.image),paths[0],(508,306),94)
            settings.setdefault('cards',{})[args.app.lower()]=f'assets/local/{slug}.jpg'
        validate(settings)
        # Write only after every imported image and configuration field validated.
        temp=settings_file.with_suffix('.json.tmp');temp.write_text(json.dumps(settings,indent=2,ensure_ascii=False)+'\n');temp.chmod(0o600);temp.replace(settings_file)
    except Exception:
        for path in paths:
            path.unlink(missing_ok=True)
        raise
    print('Local images imported without EXIF or original filenames. Nothing was uploaded.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='kind',required=True)
    wallpaper=sub.add_parser('wallpaper');wallpaper.add_argument('--id',required=True);wallpaper.add_argument('--name',required=True);wallpaper.add_argument('--day',type=Path,required=True);wallpaper.add_argument('--night',type=Path,required=True)
    card=sub.add_parser('card');card.add_argument('--id',required=True);card.add_argument('--app',required=True);card.add_argument('--image',type=Path,required=True)
    import_image(parser.parse_args())
