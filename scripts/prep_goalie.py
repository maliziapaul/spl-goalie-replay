"""Pack SPL goalie shots into public/data/goalie.bin (gzip) and src/data/goalie-meta.json.

Usage: python3 scripts/prep_goalie.py <folder of HK_GL_*.json shot files> <project root>

Binary layout (little-endian uint16, after gunzip):
  for each shot, for each channel c in 0..CH-1: n values, delta-coded mod 65536.
  Channels: 19 joints x (x,y,z), puck (x,y,z), puck speed.
  Positions are (x-89, y, z) in 0.01 ft as int16; missing puck = -32768.
  Speed in 0.1 ft/s; missing = -32768.
"""
import sys, json, glob, math, gzip, base64, struct, os

src, out = sys.argv[1], sys.argv[2]
JOINTS = ['NOSE', 'LEFT_EYE', 'RIGHT_EYE', 'LEFT_EAR', 'RIGHT_EAR', 'NECK', 'LEFT_SHOULDER', 'RIGHT_SHOULDER',
          'LEFT_ELBOW', 'RIGHT_ELBOW', 'LEFT_WRIST', 'RIGHT_WRIST', 'MID_HIP', 'LEFT_HIP', 'RIGHT_HIP',
          'LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_ANKLE', 'RIGHT_ANKLE']
NULL = -32768
q = lambda v, s: max(-32767, min(32767, int(round(v * s))))

blob = bytearray()
shots = []
for f in sorted(glob.glob(os.path.join(src, '*.json'))):
    d = json.load(open(f))
    T = d['tracking']; n = len(T)
    chans = [[] for _ in range(len(JOINTS) * 3 + 4)]
    P, V, H = [], [], []
    for t in T:
        g = t['data']['goalie']
        for j, name in enumerate(JOINTS):
            p = g[name]
            for k in range(3):
                chans[j * 3 + k].append(NULL if p is None else q(p[k] - (89 if k == 0 else 0), 100))
        p = t['data']['puck']; v = t['data']['puck_velocity']
        for k in range(3):
            chans[57 + k].append(NULL if p is None else q(p[k] - (89 if k == 0 else 0), 100))
        sp = math.sqrt(sum(c * c for c in v)) if v else None
        chans[60].append(NULL if sp is None else q(sp, 10))
        P.append(p); V.append(sp); H.append(g['MID_HIP'])
    for ch in chans:
        prev = 0
        for val in ch:
            u = val & 0xFFFF
            blob += struct.pack('<H', (u - prev) & 0xFFFF)
            prev = u

    # ---- derived metrics
    # release: the frame where the shot starts — peak speed with the puck in front of the net, walked back
    cand = [i for i in range(n) if V[i] is not None and P[i] and P[i][0] < 87 and abs(P[i][1]) < 30]
    pk = max(cand, key=lambda i: V[i]) if cand else 0
    rel = pk
    while rel > 0 and V[rel - 1] is not None and V[rel - 1] > 40: rel -= 1
    speed = max(V[i] for i in range(rel, min(n, pk + 6)) if V[i] is not None)
    origin = P[rel]
    goal = any(P[i] and 89.2 < P[i][0] < 93 and abs(P[i][1]) < 3 and P[i][2] < 4 for i in range(rel, n))
    # aim: extend the puck's straight-line path just after release to the goal line (x = 89)
    place = None
    for i in range(rel + 1, min(n, rel + 8)):
        v = T[i]['data']['puck_velocity']; p = P[i]
        if p and v and v[0] > 20 and p[0] < 88:
            t = (89 - p[0]) / v[0]
            place = [round(p[1] + v[1] * t, 2), round(max(0, p[2] + v[2] * t), 2)]
            break
    hipz = [h[2] for h in H]
    z0 = sum(hipz[:10]) / 10
    drop = next((i for i in range(max(0, rel - 60), n) if hipz[i] < 1.45), None)
    steps = [math.hypot(H[i + 1][0] - H[i][0], H[i + 1][1] - H[i][1]) for i in range(rel)]
    travel = sum(s for s in steps if s < 0.5)
    dist = math.hypot(origin[0] - 89, origin[1]) if origin else None
    angle = math.degrees(math.atan2(abs(origin[1]), 89 - origin[0])) if origin else None
    shots.append({
        'id': d['metadata']['shot_number'], 'n': n, 'hz': d['metadata']['goalie_sampling_rate__hz'],
        'rel': rel, 'speed': round(speed, 1), 'goal': goal, 'place': place,
        'origin': [round(origin[0], 2), round(origin[1], 2)] if origin else None,
        'dist': round(dist, 1) if dist else None, 'angle': round(angle, 1) if angle is not None else None,
        'side': 'L' if P[0] and P[0][1] < 0 or (not P[0] and shots and shots[-1]['side'] == 'L') else 'R',
        'drop': drop, 'minHip': round(min(hipz[rel:]), 2), 'hip0': round(z0, 2), 'travel': round(travel, 1),
        'vis': round(sum(p is not None for p in P) / n, 3),
    })

gz = gzip.compress(bytes(blob), 9)
open(os.path.join(out, 'public', 'data', 'goalie.bin'), 'wb').write(gz)
json.dump({'joints': JOINTS, 'shots': shots, 'session': '2026-08-06', 'participant': 'P0001'},
          open(os.path.join(out, 'src', 'data', 'goalie-meta.json'), 'w'), separators=(',', ':'))
print('raw', len(blob), 'gz', len(gz))
for s in shots:
    print(s['id'], s['rel'], s['speed'], 'G' if s['goal'] else '-', s['place'], s['origin'], s['dist'], s['side'],
          s['drop'] and s['drop'] - s['rel'], s['minHip'], s['travel'])
