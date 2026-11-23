import csv, json, sys, urllib.request, urllib.parse
src, out = sys.argv[1], sys.argv[2]
chars = []
with open(src, encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        for c in row['Hanzi']:
            if '一' <= c <= '鿿' and c not in chars:
                chars.append(c)
data, missing = {}, []
for c in chars:
    try:
        with urllib.request.urlopen('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/' + urllib.parse.quote(c) + '.json', timeout=20) as r:
            d = json.load(r)
            data[c] = {'strokes': d['strokes'], 'medians': d['medians']}
    except Exception as e:
        missing.append(c)
json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(chars), 'chars,', len(missing), 'missing:', ''.join(missing))
