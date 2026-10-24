"""Configuration, private-file exclusion, package reproducibility and import privacy."""
import argparse
import contextlib
import hashlib
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import configuration
import build
import import_assets


class LocalProject(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        shutil.copytree(build.APP,self.root/'app')
        shutil.copytree(build.ROOT/'LICENSES',self.root/'LICENSES')
        shutil.copyfile(build.ROOT/'LICENSE',self.root/'LICENSE')
        for module in [configuration,build,import_assets]:
            p=patch.object(module,'ROOT',self.root);p.start();self.addCleanup(p.stop)
        p=patch.object(build,'APP',self.root/'app');p.start();self.addCleanup(p.stop)
        (self.root/'local').mkdir()
        (self.root/'app/assets/local').mkdir(exist_ok=True)

    def test_unknown_keys_and_remote_or_traversing_media_rejected(self):
        for value in [{'device':'not-a-setting'}, {'cards':{'Example':'https://example.com/logo.jpg'}}, {'cards':{'Example':'assets/local/../icon.png'}}]:
            with self.subTest(value=value),self.assertRaises(ValueError):
                configuration.validate(value)

    def test_solar_limits_and_zone_are_checked(self):
        for latitude,zone in [(91,'UTC'),(float('nan'),'UTC'),(45,'Invalid/Zone')]:
            with self.subTest(latitude=latitude,zone=zone),self.assertRaises((ValueError,KeyError)):
                configuration.validate({'solar':{'latitude':latitude,'longitude':0,'timeZone':zone}})

    def test_symlink_image_is_rejected(self):
        image=self.root/'app/assets/local/link.jpg'
        image.symlink_to(self.root/'app/icon.png')
        with self.assertRaises(ValueError):
            configuration.validate({'cards':{'Example':'assets/local/link.jpg'}})

    def test_public_build_ignores_invalid_private_settings_and_assets(self):
        marker=b'private fixture content'
        (self.root/'local/settings.json').write_bytes(b'not even JSON')
        (self.root/'app/assets/local/private.jpg').write_bytes(marker)
        _,files=build.contents(public=True)
        self.assertFalse(any(name.startswith('assets/local/') for name in files))
        self.assertNotIn(marker,b''.join(files.values()))
        self.assertNotIn(b'FrameUserConfig',files['config.js'].split(b'(function')[0])
        with self.assertRaises(json.JSONDecodeError):
            build.contents(public=False)

    def test_personal_config_only_embeds_allowlisted_options(self):
        (self.root/'local/settings.json').write_text(json.dumps({'theme':'slate','favoriteNames':['Example']}))
        _,files=build.contents()
        self.assertIn(b'FrameUserConfig',files['config.js'])
        self.assertIn(b'Example',files['config.js'])
        _,public=build.contents(public=True)
        self.assertEqual(public['config.js'],(self.root/'app/config.js').read_bytes())

    def test_unsigned_package_is_reproducible_and_contains_licenses(self):
        with contextlib.redirect_stdout(io.StringIO()):
            target=build.build(public=True)
            first=target.read_bytes()
            build.build(public=True)
        self.assertEqual(first,target.read_bytes())
        with zipfile.ZipFile(target) as archive:
            self.assertIn('LICENSES/Inter-OFL.txt',archive.namelist())
            self.assertIn('LICENSE',archive.namelist())
            self.assertFalse(any('signature' in name for name in archive.namelist()))
            self.assertTrue(all(info.date_time==(2026,1,1,0,0,0) for info in archive.infolist()))
        report=json.loads((self.root/'dist/package-audit.json').read_text())
        self.assertFalse(report['signed'])
        self.assertTrue(report['publicDefaults'])
        self.assertEqual(report['sha256'],hashlib.sha256(first).hexdigest())

    def test_import_strips_metadata_and_duplicate_id_preserves_old_files(self):
        try:
            from PIL import Image
        except ImportError:
            self.skipTest('Optional Pillow is not installed')
        original=self.root/'personal-original-name.jpg'
        image=Image.new('RGB',(900,900),'#35677a')
        exif=Image.Exif();exif[315]='private metadata fixture'
        image.save(original,exif=exif)
        args=argparse.Namespace(kind='card',id='example',app='Example',image=original)
        with contextlib.redirect_stdout(io.StringIO()):
            import_assets.import_image(args)
        target=self.root/'app/assets/local/example.jpg'
        with Image.open(target) as result:
            self.assertFalse(result.getexif())
            self.assertLessEqual(result.width,508);self.assertLessEqual(result.height,306)
        before=target.read_bytes();settings=(self.root/'local/settings.json').read_bytes()
        self.assertNotIn(b'personal-original-name',settings)
        with self.assertRaises(ValueError):
            import_assets.import_image(args)
        self.assertEqual(target.read_bytes(),before)
        self.assertEqual((self.root/'local/settings.json').read_bytes(),settings)


if __name__=='__main__':
    unittest.main()
