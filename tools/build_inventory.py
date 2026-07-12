#!/usr/bin/env python3
"""One-time seed: convert scraped 999.md data into data/inventory.js.

After seeding, data/inventory.js is owned by /admin.html — the admin panel
is the system of record. This script is only for re-seeding from scratch.
"""
import json, os, re, sys

BASE = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(BASE, 'data', 'cars_full.json')
OUT = os.path.join(BASE, 'data', 'inventory.js')

cars = json.load(open(SRC))

def num(s):
    m = re.search(r'[\d.]+', (s or '').replace(' ', ''))
    return m.group(0) if m else None

out = []
for c in cars:
    f = c['features']
    desc = (c['description'] or '').replace('\r', '')
    equip, prose = [], []
    for line in desc.split('\n'):
        s = line.strip()
        if re.match(r'MODALIT', s, re.I):
            break
        if s.startswith('-'):
            item = s.lstrip('-').strip(' \t')
            if item:
                equip.append(item)
        elif s:
            prose.append(s)
    power = f.get('Putere')
    make = f.get('Marcă', '')
    model = f.get('Model', '')
    out.append({
        'id': c['id'],
        'make': make,
        'model': model,
        'name': (make + ' ' + model).strip() or c['listTitle'],
        'gen': f.get('Generație', ''),
        'year': c['year'] or int(f.get('An de fabricație', 0) or 0),
        'price': c['price']['value'],
        'km': c['mileage'] if c['mileage'] is not None else 0,
        'power': int(num(power)) if power and num(power) else None,
        'engine': f.get('Motor', ''),
        'fuel': f.get('Tip combustibil', '') or c.get('fuel') or '',
        'box': f.get('Cutie de viteze', '') or c.get('transmission') or '',
        'drive': f.get('Tip tracțiune', '') or c.get('drive') or '',
        'body': f.get('Tip caroserie', ''),
        'seats': f.get('Număr de locuri', ''),
        'doors': f.get('Număr uși', ''),
        'wheel': f.get('Volan', ''),
        'vin': f.get('VIN-cod', ''),
        'reg': f.get('Înmatriculare', ''),
        'origin': f.get('Țara de origine', ''),
        'status': 'disponibil',
        'prose': '\n'.join(prose),
        'equip': equip,
        'images': c['images'],
        'url': 'https://999.md/ro/' + c['id'],
    })

inv = {'cars': out, 'featured': [], 'updatedAt': None}
with open(OUT, 'w') as fp:
    fp.write('// Managed by /admin.html — do not edit by hand.\n')
    fp.write('window.PK_INVENTORY = ')
    json.dump(inv, fp, ensure_ascii=False, separators=(',', ':'))
    fp.write(';\n')

print('wrote', OUT, '-', len(out), 'cars')
